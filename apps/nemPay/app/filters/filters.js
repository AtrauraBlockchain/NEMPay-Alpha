import helpers from '../../../nanowallet/src/app/utils/helpers';
import Network from '../../../nanowallet/src/app/utils/Network';
import convert from '../../../nanowallet/src/app/utils/convert';
import KeyPair from '../../../nanowallet/src/app/utils/KeyPair';
import Address from '../../../nanowallet/src/app/utils/Address';


/**
* fmtNemDate() Format a timestamp to NEM date
*
* @param data: A timestamp
*
* @return a date string
*/
let fmtNemPayDate = function() {
    let nemesis = Date.UTC(2015, 2, 29, 0, 6, 25);
    return function fmtNemPayDate(data) {
        if (data === undefined) return data;
        let o = data;
        let t = (new Date(nemesis + o * 1000));

        var mmUTC = t.getUTCMonth() + 1;
        var ddUTC = t.getUTCDate();
        var yyUTC = t.getFullYear();
        return mmUTC + "/" + ddUTC + "/" + yyUTC;
    };
}


module.exports = {
    fmtNemPayDate,
}