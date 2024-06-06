const TransformedRules = Object.freeze({
    IGNORE: 0b00
});

function Tii(ins1, ins2, ord) {
    if (ins1.bid !== ins2.bid || ins1.fieldName !== ins2.fieldName) {
        return ins1;
    } else if (ins1.p < ins2.p || (ins1.p === ins2.p && ord)) {
        return ins1;
    } else {
        const newIns = structuredClone(ins1);
        newIns.p += ins2.d.length;
        return newIns;
    }
}

function Tid(ins, del) {
    if (ins1.bid !== ins2.bid || ins1.fieldName !== ins2.fieldName) {
        return ins1;
    } else if (ins.p <= del.p1) {
        return ins;
    } else {
        const newIns = structuredClone(ins);
        newIns.p -= Math.min(ins.p - del.p1, del.p2 - del.p1 + 1);
        return newIns;
    }
}

function Tdi(del, ins) {
    if (ins1.bid !== ins2.bid || ins1.fieldName !== ins2.fieldName) {
        return ins1;
    } else if (del.p2 < ins.p) {
        return del;
    } else if (del.p1 >= ins.p) {
        const newDel = structuredClone(del);
        newDel.p1 += ins.d.length;
        newDel.p2 += ins.d.length;
        return newDel;
    } else {
        const newDelLeft = structuredClone(del);
        newDelLeft.p2 = ins.p - 1;

        const newDelRight = structuredClone(del);
        newDelRight.p1 = ins.p + ins.d.length;
        newDelRight.p2 += ins.d.length;

        return [newDelLeft, newDelRight];
    }
}

function Tdd(del1, del2) {
    if (ins1.bid !== ins2.bid || ins1.fieldName !== ins2.fieldName) {
        return ins1;
    } else if (del1.p1 === del2.p1 && del1.p2 === del2.p2) {
        return TransformedRules.IGNORE;
    } else if (del1.p1 >= del2.p1 && del1.p2 <= del2.p2) {
        return TransformedRules.IGNORE;
    } else if (del1.p2 < del2.p1) {
        return del1;
    } else if (del1.p1 > del2.p2) {
        const del2Length = del2.p2 - del2.p1 + 1;

        const newDel = structuredClone(del1);
        newDel.p1 -= del2Length;
        newDel.p2 -= del2Length;
    
        return newDel;
    } else {
        const del2Length = del2.p2 - del2.p1 + 1;

        const newDel = structuredClone(del1);
        newDel.p1 = Math.min(del1.p1, del2.p1);
        newDel.p2 = Math.max(del2.p1 - 1, del1.p2 - del2Length);
        return newDel;
    }
}

function Trr(reord1, reord2, ord) {
    if (reord1.bid === reord2.bid && reord1.p === reord2.p) {
        return TransformedRules.IGNORE;
    } else if (reord1.bid === reord2.bid && ord) {
        return reord1;
    } else if (reord1.bid === reord2.bid) {
        return TransformedRules.IGNORE;
    } else if (reord1.p === reord2.p && ord) {
        return reord1;
    } else if (reord1.p === reord2.p) {
        const newReord = structuredClone(reord1);
        newReord.p += 1;
        return newReord;
    } else if (reord1.p > reord2.p && reord1.p < reord2.prevp) {
        const newReord = structuredClone(reord1);
        newReord.p += 1;
        return newReord;
    } else if (reord1.p < reord2.p && reord1.p > reord2.prevp) {
        const newReord = structuredClone(reord1);
        newReord.p -= 1;
        return newReord;
    } else {
        return reord1;
    }
}

function Taa(action1, action2, ord) {
    if (action1.subtype === action2.subtype && !ord) {
        return TransformedRules.IGNORE;
    } else {
        return action1;
    }
}

module.exports = {
    Tii, Tid, Tdi, Tdd, Trr, Taa,
    TransformedRules
};
