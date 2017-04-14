import Network from '../utils/Network';
import convert from '../utils/convert';
import KeyPair from '../utils/KeyPair';
import CryptoHelpers from '../utils/CryptoHelpers';
import Serialization from '../utils/Serialization';
import helpers from '../utils/helpers';
import Address from '../utils/Address';
import TransactionTypes from '../utils/TransactionTypes';

/** Service to build transactions */
class Alias {

    /**
     * Initialize services and properties
     *
     * @param {service} Wallet - The Wallet service
     * @param {service} NetworkRequests - The NetworkRequests service
     */
     constructor($q, $location, Wallet, NetworkRequests, Alert, AliasAlert, Transactions, nemUtils) {
        'ngInject';
        /***
         * Declare services
         */
        this._$q = $q;
        this._location = $location;
        this._Wallet = Wallet;
        this._NetworkRequests = NetworkRequests;
        
        this._Alert = Alert;
        this._AliasAlert = AliasAlert;
        this._Transactions = Transactions;
        this._nemUtils = nemUtils;

        // Set Root and Namespace Index depending on the network
        this.ALIAS_ROOT_INDEX = "";
        this.ALIAS_NAMESPACE_INDEX = "";
        this.ownAlias = "";

        this.aliasCache = {};

        // If no wallet show alert and redirect to home
        if (!this._Wallet.current) {
            this._Alert.noWalletLoaded();
            this._location.path('/');
            return;
        }

        this.fetchIndexes().then(()=>{this.fetchOwnAlias();});
    }

    getAlias(){
        return this.ownAlias;
    }

    getRootIndex(){
        return this.ALIAS_ROOT_INDEX;
    }

    getNamespaceIndex(){
        return this.ALIAS_NAMESPACE_INDEX;
    }
    fetchOwnAlias(){
        return this.fetchAddress(this._Wallet.currentAccount.address).then((alias)=>{
            this.ownAlias = "";
            if(alias){
                // console.log(this._Wallet.currentAccount.address+" is linked to "+alias);
                this.ownAlias = alias;
            }
            return alias;
        }).catch((err)=>{this._AliasAlert.unexpectedError(err)});
    }
    fetchAddress(address){
        var options = {};
        var alias;
        
        if(!address){
            var deferred = this._$q.defer();
            deferred.resolve("");
            return deferred.promise;
        }

        // We are just interested on aliases set by the account itself
        options.fromAddress = address;
        // Search for the last set alias by self
        return this._nemUtils.getLastMessageWithString(address, "alias=", options).then((message)=>{
            // The message should have the format alias=[alias]
            if(message) alias = message.split("=")[1];
            return alias;
        })
        .then((alias)=>{
            // Verify that the Alias is valid
            if(alias) return this.fetchAlias(alias);
        })
        .then((fetchedAddress)=>{
            if(fetchedAddress == address) return alias;
            else return;
        });
    }

    /**
     * fetchAlias() Get recipient account data from network using @alias

     * // Example alias: @samy
     * // Example alias: samy@atraura
     * // atraura is a valid Namespace
     * 
     * @param alias: The recipient alias (namespace)
     */
     fetchAlias(alias) {
        // TODO: Prepare to be able to update RI, do it in constructor

        if(!alias){
            var deferred = this._$q.defer();
            deferred.resolve("");
            return deferred.promise;
        }

        // Alias cleanup: strip anything except for '.' and alphabetical characters
        alias = alias.replace(/[^.A-Z0-9]/gi, "");
        var pointer;

        console.log("Fetching alias: "+alias);
        // console.log("// 0. Check if a namespace exists with the same name as the alias, we will always prioritize this on the system");
        return this._NetworkRequests.getNamespacesById(helpers.getHostname(this._Wallet.node), alias).then((data) => {
            if(data.owner){
                return data.owner;    
            }
            else{
                throw "This should never happen";
            }
        })
        .catch(()=>{
            // Already cached
            if(alias in this.aliasCache){
                // console.log("cached");
                return this.aliasCache[alias];
            }

            // 1. Check if the alias is from a Namespace or Root
            let a = alias.split(".");
            if(a.length == 1){
                // 1a. No '.' -> regular alias: [alias]
                alias = a[0];

                // console.log("// 1a.1a Search [RI] for the alias");
                return this._nemUtils.getTransactionsWithString(this.ALIAS_ROOT_INDEX, alias)
                .then((results)=>{
                    var lastExpiredOn = 0;
                    // console.log("1a.1a", results);
                    for(var i=0; i<results.length; i++){

                        let result = results[i];
                        
                        // 1a.1a.1 Get Pointer Account from the FIRST message in [RI] where alias was found, where xem >= 500

                        let message = result.transaction.message.split('=');
                        if(message[0] == alias && message.length >= 2){

                            let today = helpers.createNEMTimeStamp();
                            let txTS = result.transaction.timeStamp;
                            // Hiring an alias is 450xem per year
                            let years = Math.floor(result.transaction.amount/450/1000000);
                            let txExpirationDate = txTS+years*365*24*60*60;
                            if( txExpirationDate > today && lastExpiredOn < txTS ){
                                pointer = message[1];
                                
                                // 1a.1a.2 Search Pointer Account for LASTS valid account
                                let options = {};
                                options.fromAddress = this.ALIAS_ROOT_INDEX;

                                // 1a.1a.2.1 Search PA for last message from RI -> last moderated owner, or just the first message if none -> last owner
                                // console.log("1a.1a.2.1 Searching "+pointer+" for LAST 'alias_owner='' from"+options.fromAddress);
                                return this._nemUtils.getLastMessageWithString(pointer, "alias_owner=", options);
                            }
                            else{
                                lastExpiredOn = txExpirationDate;
                            }

                        }
                    }
                    // 1a.1b Alias doesn't exist
                    throw "Alias doesn't exist";
                })
                .then((result)=>{
                    // See if this alias was overwritten by ROOT INDEX
                    if(result && result.length > 0){
                        // If has been, we get the last owner's address
                        let last_owner = result.split("=")[1];
                        let options = {};
                        options.fromAddress = last_owner;

                        // 1a.1a.2.2 Follow owners chain in order to get the last one
                        // console.log("1a.1a.2.2a Searching "+pointer+" for LAST 'alias_owner='' from"+options.fromAddress);
                        return this._nemUtils.getLastMessageWithString(pointer, "alias_owner=", options);
                    }  
                    else{
                        // console.log("1a.1a.2.2b Searching "+pointer+" for FIRST 'alias_owner='' from anyone ");
                        return this._nemUtils.getFirstMessageWithString(pointer, "alias_owner=");
                    }
                })
                .then((result)=>{
                    // Grab the last account that the last owner wanted to point
                    let acct = result.split("=")[1];
                    this.aliasCache[alias] = acct;
                    return acct;
                })
                .catch((err)=>{
                    if(err == "Alias doesn't exist"){
                        // The alias does not exsts
                        this._AliasAlert.doesNotExistWarning(alias);
                    }
                    else{
                        this._AliasAlert.unexpectedError(err);
                    }
                });
            }
            else if(a.length == 2){
                this._AliasAlert.nsaliasNotReady();
                return;

                // 1b. Has a '.' -> namespace alias
                // Namespaced Alias
                // 1b.1 Split alias in @[namespace].[alias]
                // 1b.2 Search [NSI] for LAST Message with namespace from [RI] -> Namespace Pointer Index [NPI]
                    // 1b.2a (empty) Namespace doesn't have any account yet, return address from namespace owner
                    // 1b.2b A Namespace Pointer Index account exists [NPI]
                        // 1b.2b.1 Get real namespace owner -> [O]
                        // 1b.2b.2 Get all messages with "alias=""
                        // 1b.2b.3 Is there any from [O]?
                            // 1b.2b.3b YES - Use the LAST from [O] as the valid one
                            // 1b.2b.3b NOPE - Use the LAST as the valid one ?
            }
            else{
                // Wrong format
                this._AliasAlert.wrongFormat();
                return;

            }
        });
    }

    fetchIndexes(){
        if (this._Wallet.network === Network.data.Mainnet.id) {
            // console.log("MAINNET");
            this.ALIAS_ROOT_INDEX = "NALIASJNTP65XU3Z2YADL7OJWZDDB2GJRO4X5JW6";
            this.ALIAS_NAMESPACE_INDEX = "NALIASFMJ35B3AAC5EL4DOCIKS4RVMUG24YHURMR";
        } else if (this._Wallet.network === Network.data.Testnet.id) {
            // console.log("TESTNET");
            this.ALIAS_ROOT_INDEX = "TDVYJTYYPCO5AORERRTDUJ3BYYTSF6BTLOIAF2UR";
            this.ALIAS_NAMESPACE_INDEX = "TCEEU7QUHGBW4ICDR3PH2LAFP2M7JMHAW4BQMOUT";
        } else {
            // console.log("MIJINNET");
            // Mijin nodes
            // TODO: SET EXPLICIT ALERT
        }
        
        // Make sure that ROOT Index has not changed
        let options = {"fromAddress":this.ALIAS_ROOT_INDEX};
        return this._nemUtils.getLastMessageWithString(this.ALIAS_NAMESPACE_INDEX, "@=", options).then((message)=>{
            if(message){
                let rootIndex = message.split("=")[1];            
                if(this.ALIAS_ROOT_INDEX != rootIndex){
                  console.log("ALIAS_ROOT_INDEX has been updated to: "+rootIndex);  
                  this.ALIAS_ROOT_INDEX = rootIndex;
                }    
            }
        }).catch();
    }

    reset(){
        this.ALIAS_ROOT_INDEX = "";
        this.ALIAS_NAMESPACE_INDEX = "";
        this.ownAlias = "";
        if(!this.aliasCache) this.aliasCache = {};
        return this.fetchIndexes().then(()=>this.fetchOwnAlias());
    }
}

export default Alias;