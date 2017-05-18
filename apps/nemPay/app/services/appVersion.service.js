
import Network from '../utils/Network';
import Nodes from '../utils/nodes';
import helpers from '../utils/helpers';


/** Service to build transactions */
class AppVersion {

    /**
     * Initialize services and properties
     *
     * @param {service} Wallet - The Wallet service
     * @param {service} NetworkRequests - The NetworkRequests service
     */
    constructor(Wallet, NetworkRequests, Alert,  $filter) {
        'ngInject';
        /***
         * Declare services
         */
        this._Wallet = Wallet;
        this._NetworkRequests = NetworkRequests;

        this._Alert = Alert;

        this._$filter = $filter;

        // Set Root Index depending on the network
        this.APP_VERSION_ROOT_INDEX = "";
        this.node = undefined;
    }


    /**
     * fetchAppVersion() Get last app version and show if should be updated
     *
     */
    fetchAppVersion() {
        var production = false;
        if (production) {
            this.APP_VERSION_ROOT_INDEX = "NCOTBA2NOU5N6HELGC2QSB57EBQRYZ6AVKIYJNYL";
            this.node = Nodes.defaultMainnetNode;

        } else {
            this.APP_VERSION_ROOT_INDEX = "TDAV26O6FISNC7VTGXLE62XLDBVV3X3LIM4XTL7C";
            this.node = Nodes.defaultTestnetNode;

        }
        var signatoryPublicKey = "";

        return this._NetworkRequests.getAccountData(helpers.getHostname(this.node), this.APP_VERSION_ROOT_INDEX).then((data) => {

            signatoryPublicKey = data.account.publicKey;
            return this._NetworkRequests.getAllTransactionsFromID(helpers.getHostname(this.node), this.APP_VERSION_ROOT_INDEX, null);
        }).then((result)=>{
            var transactions = result.data;
            // If there transactions were returned and the limit was not reached
            if (transactions.length == 0) throw Error("No version found");

            // Order transactions chronologically
            transactions.sort(function(a,b){
                return b.transaction.timeStamp - a.transaction.timeStamp;
            });
            var validTransactions = [];

            transactions.forEach(transaction => {
                let tx = transaction.transaction;
                if(tx.type==257){
                    // On this version we are only using decoded messages!
                    let msg = this._$filter('fmtHexMessage')(tx.message);

                    // Check if transaction should be added depending on the message and its signer
                    if(msg.indexOf("version") != -1 && signatoryPublicKey == tx.signer) {
                        // We store
                        transaction.transaction.message = msg;
                        validTransactions.push(msg);
                    }
                }
            });

            let message = JSON.parse(validTransactions[0]);

            return message.version;

        }).catch();
    }


}

export default AppVersion;