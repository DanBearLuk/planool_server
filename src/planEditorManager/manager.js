const Cache = require('../cache');
const { attachUserToSocket, checkPlanAccessFromSocket, PlanRoles } = require('../middlewares/socketMiddlewares');
const { Tii, Tid, Tdd, Tdi, Trr, Taa, TransformedRules } = require('./OTfunctions');

const EditTypes = Object.freeze({
    INSERT:  0b00,
    DELETE:  0b01,
    REORDER: 0b10,
    ACTION:  0b11
});

const OTF = {
    [[EditTypes.INSERT, EditTypes.INSERT]]: Tii,
    [[EditTypes.INSERT, EditTypes.DELETE]]: Tid,
    [[EditTypes.DELETE, EditTypes.INSERT]]: Tdi,
    [[EditTypes.DELETE, EditTypes.DELETE]]: Tdd,
    [[EditTypes.REORDER, EditTypes.REORDER]]: Trr,
    [[EditTypes.ACTION, EditTypes.ACTION]]: Taa,
};

class PlanEditorManager {
    constructor(socketManager, database) {
        this._cache = new Cache(['plans']);
        this._intervals = {};
        this._db = database;
        this._socketManager = socketManager;

        this._initSocketListeners();

        this._cache.on('plans', 'del', (planId, plan) => {
            this._socketManager.emit(plan.connectedSockets, 'planEditor/disconnect', { planId });
            this._unloadPlan(this._cache.get(plan));
        });
    }

    _initSocketListeners() {
        this._socketManager.use('planEditor/connect', attachUserToSocket(this._db));
        this._socketManager.use('planEditor/connect', attachPlanToSocket(this._db));
        this._socketManager.use('planEditor/connect', checkPlanAccessFromSocket(this._db, PlanRoles.EDITOR));
        this._socketManager.use('planEditor/connect', this._connectUser);

        this._socketManager.use('planEditor/handleEdit', this._handleChange);

        this._socketManager.use('planEditor/disconnect', this._disconnectUser);
    }

    _handleChange(req, res) {
        const socketId = req.socketInfo.socketId;
        const planId = req.data.planId;
        const action = req.data.actionInfo;

        const plan = this._cache.get('plans', planId);

        if (plan) {
            return res(404, 'Cached plan not found');
        } else if (plan.connectedSockets.indexOf(socketId) === -1) {
            return res(401, 'No connection established');
        }

        let needPropagation = true;
        const transformedAction = action;

        if (action.rev !== plan.lastRevision) {
            const revOffset = plan.lastRevision - action.rev;

            for (let i = plan.log.length - revOffset; i++; i < plan.log.length) {
                const loggedAction = plan.log[i];
                const actionTypePair = [transformedAction.type, loggedAction.type];
                const OTFunction = OTF[actionTypePair];

                if (!OTFunction) {
                    continue;
                }

                const result = OTFunction(transformedAction, loggedAction, socketId < loggedAction.sid);

                if (result === TransformedRules.IGNORE) {
                    needPropagation = false;
                    break;
                } else {
                    transformedAction = needPropagation;
                }
            }
        }

        if (needPropagation) {
            transformedAction.sid = socketId;

            const socketIds = plan.connectedSockets.filter(sid => sid !== socketId);
            
            this._socketManager.emit(socketIds, 'planEditor/handleEdit', {
                planId,
                actionInfo: transformedAction
            }, 
            sid => {
                let idx = plan.connectedSockets.indexOf(sid);
                plan.connectedSockets.splice(idx, 1);

                if (plan.connectedSockets.length === 0) {
                    this._unloadPlan(plan);
                }
            });

            plan.log.push(transformedAction);
            plan.lastRevision += 1;
        }

        this._cache.ttl('plans', planId, 1200);
    }
    
    _applyEdit(planId, actionInfo) {
        const plan = this._cache.get('plans', planId);

        switch (actionInfo.type) {
            case EditTypes.INSERT: {
                const { bid: blockId, fieldName, p: pos, d: data} = actionInfo;
                this._applyInsert(plan, blockId, fieldName, pos, data);
                break;
            }

            case EditTypes.DELETE: {
                const { bid: blockId, fieldName, p: pos, c: count} = actionInfo;
                this._applyDelete(plan, blockId, fieldName, pos, count);
                break;
            }

            case EditTypes.REORDER: {
                const { bid: blockId, p: pos} = actionInfo;
                this._applyReorder(plan, blockId, pos);
                break;
            }

            case EditTypes.ACTION: {
                this._applyAction(plan, actionInfo);
                break;
            }
        }
    }

    _applyInsert(plan, blockId, fieldName, pos, data) {
        const block = plan.blocks.find(block => block.id === blockId);
        const text = block.fields[fieldName];

        block.fields[fieldName] = text.slice(0, pos) + data + text.slice(pos);
    }

    _applyDelete(plan, blockId, fieldName, pos, count) {
        const block = plan.blocks.find(block => block.id === blockId);
        const text = block.fields[fieldName];

        block.fields[fieldName] = text.slice(0, pos) + text.slice(pos + count);
    }

    _applyReorder(plan, blockId, pos) {
        const block = plan.blocks.find(block => block.id === blockId);
        const idx = plan.blocks.indexOf(block);

        plan.blocks.splice(idx, 1);
        plan.blocks.splice(pos, 0, block);
    }

    _applyAction(plan, actionInfo) {
        switch(actionInfo.subtype) {
            case (deleteBlock):
                const blockId = actionInfo.blockId;
                plan.blocks = plan.blocks.filter(block => block.id !== blockId);
                break;
            
            case (setFieldValue):
                const fieldName = actionInfo.fieldName;
                const value = actionInfo.value;

                if (plan.hasOwnProperty(fieldName)) {
                    plan[fieldName] = value;
                }

                break;
            
            default:
                break;
        }
    }

    async _connectUser(req, res) {
        const socketId = req.socketInfo.socketId;
        const planId = req.data.planId;

        if (!this._cache.has('plans', planId)) {
            await this._loadPlan(planId);
        } else {
            this._cache.ttl('plans', planId, 1200);
        }

        const plan = this._cache.get('plans', planId);
        plan.connectedSockets.push(socketId);

        if (!this._intervals[planId]) {
            this._intervals[planId] = setInterval(() => this._savePlan(plan), 300000);
        }

        return res(200, {
            ok: true,
            planInfo: plan.planInfo,
            lastSyncedRevision: plan.lastRevision
        });
    }

    _disconnectUser(req, res) {
        const socketId = req.socketInfo.socketId;
        const planId = req.data.planId;

        const plan = this._cache.get('plans', planId);

        const idx = plan.connectedSockets.indexOf(socketId);
        plan.connectedSockets.splice(idx, 1);

        if (plan.connectedSockets.length === 0) {
            this._unloadPlan(this._cache.get(planId));
        }
        
        return res(200);
    }

    async _loadPlan(planId) {
        const planInfo = await this._db.findPlanRecord(planId);

        if (!planInfo) {
            throw new Error('Plan not found');
        }

        const plan = {
            ...planInfo,
            connectedSockets: [],
            lastRevision: 0,
            log: []
        };

        this._cache.set('plans', planId, plan, 1200);
    }

    async _unloadPlan(plan) {
        await this._savePlan(plan);

        this._cache.del('plans', plan.id);
            
        clearInterval(this._intervals(plan.id));
        delete this._intervals[plan.id];
    }

    async _savePlan(plan) {
        await this._db.updatePlanRecord(plan.id, plan);
    }
}

module.exports = PlanEditorManager;
