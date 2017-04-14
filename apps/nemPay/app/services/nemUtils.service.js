import Network from '../utils/Network';
import convert from '../utils/convert';
import KeyPair from '../utils/KeyPair';
import CryptoHelpers from '../utils/CryptoHelpers';
import Serialization from '../utils/Serialization';
import helpers from '../utils/helpers';
import Address from '../utils/Address';
import TransactionTypes from '../utils/TransactionTypes';

/** Service to build transactions */
class nemUtils {

    /**
     * Initialize services and properties
     *
     * @param {service} Wallet - The Wallet service
     * @param {service} $http - The angular $http service
     * @param {service} DataBridge - The DataBridge service
     * @param {service} NetworkRequests - The NetworkRequests service
     */
    constructor($q, $http, $filter, $timeout, Wallet, WalletBuilder, DataBridge, NetworkRequests, Alert, Transactions) {
        'ngInject';

        /***
         * Declare services
         */
        this._$q = $q;
        this._$http = $http;
        this._$timeout = $timeout;
        this._$filter = $filter;
        this._Wallet = Wallet;
        this._WalletBuilder = WalletBuilder;
        this._DataBridge = DataBridge;
        this._NetworkRequests = NetworkRequests;
        this._Alert = Alert;
        this._Transactions = Transactions;
        this.disableSuccessAlert = false;

    }

    disableSuccessAlerts(){
        this.disableSuccessAlert = true;
    }

    enableSuccessAlerts(){
        this.disableSuccessAlert = false;
    }


    /**
     * getLastMessageWithString(address,str,start) Obtains the last Message that contains string after position start
     *
     * @param {string} address - NEM Address to explore
     * @param {string} str - String to find on addresses txs
     * @param {object} options - Dictionary that can contain: 
     *                 options.fromAddress (only return transactions)
     *                 options.start (starting character of the string to look into)
     *
     * @return {promise} - A promise of the NetworkRequests service that returns a string with the filtered message
     */
    getLastMessageWithString(address, str, options){

        // Limit transactions to be returned to 1 since we just want the last one.
        // This way we avoid plenty of unnecessary calls
        if(!options) options = {};
        options.limit = 1;

        return this.getTransactionsWithString(address, str, options).then((result)=>{
            let message;
            if(result && result.length>0){
                message = result[0].transaction.message;
            }
            return message;
        });
    }

    /**
     * getFirstMessagesWithString(address,str,start) Obtains the last Message that contains string after position start
     *
     * @param {string} address - NEM Address to explore
     * @param {string} str - String to find on addresses txs
     * @param {object} options - Dictionary that can contain: 
     *                 options.fromAddress (only return transactions)
     *                 options.start (starting character of the string to look into)     
     *
     * @return {promise} - A promise of the NetworkRequests service that returns a string with the filtered message
     */
    getFirstMessageWithString(address, str, options){

        // Get ALL Transactions since the API only allows us to iterate on a descending order
        return this.getTransactionsWithString(address, str, options).then((result)=>{
            let message;
            if(result && result.length>0){

                // Get the first message ever
                message = result[result.length-1].transaction.message;
            }
            return message;
        });
    }

    /**
     * getTransactionsWithString(address, str, start) Obtains every transaction message that contains a certain string (starting from position start)
     *
     * @param {string} address - NEM Address to explore
     * @param {string} str - String to find on addresses txs
     * @param {object} options - Dictionary that can contain: 
     *                 options.fromAddress (only return transactions)
     *                 options.start (starting character of the string to look into)
     *                 options.limit - Limit amount of results to return
     *
     * @return {promise} - A promise of the NetworkRequests service that returns an Array with the filtered messages
     */
    getTransactionsWithString(address, str, options){
        
        var signatoryPublicKey;
        var trans = [];
        var promise;

        // Options is optional
        if(!options || options.constructor != Object) options = {};
        if(!options.start) options.start = 0;

        // Recursive promise that will obtain every transaction from/to <address>, order it chronologically and return the ones
        // whose message contains <str>. 
        var getTx = (function(txID) {

            // Obtain all transactions to/from the address
            return this._NetworkRequests.getAllTransactionsFromID(helpers.getHostname(this._Wallet.node), address, txID).then((result)=>{
                var transactions = result.data;
                // If there transactions were returned and the limit was not reached
                if(transactions.length > 0 && (!options.limit || trans.length<options.limit)){

                    // IDs are ordered, we grab the latest
                    var last_id = transactions[transactions.length-1].meta.id;

                    // Order transactions chronologically
                    transactions.sort(function(a,b){
                        return b.transaction.timeStamp - a.transaction.timeStamp;
                    });

                    // Iterate every transaction and add the valid ones to the array
                    for( var i = 0; transactions.length > i && (!options.limit || trans.length<options.limit);i++){

                        let transaction = transactions[i].transaction;
                        let meta = transactions[i].meta;

                        if(transaction.type==257){
                            // On this version we are only using decoded messages!
                            let msg = this._$filter('fmtHexMessage')(transaction.message);

                            // Check if transaction should be added depending on the message and its signer
                            if(msg.includes(str, options.start) && (!signatoryPublicKey || signatoryPublicKey == transaction.signer)){
                                // We decode the message and store it
                                transactions[i].transaction.message = msg;
                                trans[trans.length] = transactions[i];
                            }
                        }
                    }
                    // Keep searching for more transactions after last_id
                    return getTx(last_id);
                }
                else{
                    return trans;
                }
            });
        }).bind(this);

        // Obtain address' publicKey and set it to signatoryPublicKey
        var getAccountData = (function(address){
            // console.log("Inquiring: "+address);
            return this._NetworkRequests.getAccountData(helpers.getHostname(this._Wallet.node), address).then((data) => {
                signatoryPublicKey = data.account.publicKey;
                return signatoryPublicKey;
            });
        }).bind(this);


        // If the messages need to be signed by options.fromAddress
        if(options && options.fromAddress){
            // Obtain address' publicKey
            // console.log("Obtain address' "+options.fromAddress);
            promise = getAccountData(options.fromAddress).then(()=>{
                // Obtain transactions and check they are from signatoryPublicKey
                return getTx();
            }); 
        }
        else{ 
            // Obtain all transactions
            promise = getTx();
        }

        return promise;
    }

    /**
     * isAvaliableForMS(address) Checks if address can be obtained and transformed to a MultiSig account.
     *
     * @param {string} address - Address to check
     *
     * @return {promise} - A promise of the NetworkRequests service that returns true if the account is not another account's cosignatory nor already has cosignaroties. 
     */
    isAvaliableForMS(address){
        var deferred = this._$q.defer();
        var promise = deferred.promise;
        return this._NetworkRequests.getAccountData(helpers.getHostname(this._Wallet.node), address).then((data) => {
            var result = true;
            
            // This account should not own any other account
            if (data.meta.cosignatoryOf.length > 0) {
                this._Alert.cosignatoryCannotBeMultisig();
                result = false;

            // This account should not be owned already
            } else if (data.meta.cosignatories.length > 0) {
                this._Alert.alreadyMultisig();
                result = false;
            }
            deferred.resolve(result);
        },
        (err) => {
            if(err.status === -1) {
                this._Alert.connectionError();
            } else {
                this._Alert.getAccountDataError(err.data.message);
            }
            throw err;
        });
        return deferred.promise;
    }

    /**
     * processTxData(transferData) Processes transferData
     * 
     * @param {object} tx - The transaction data
     *
     * @return {promise} - An announce transaction promise of the NetworkRequests service
     */
    processTxData(transferData) {
        // return if no value or address length < to min address length
        if (!transferData || !transferData.recipient || transferData.recipient.length < 40) {
            return;
        }

        // Clean address
        let recipientAddress = transferData.recipient.toUpperCase().replace(/-/g, '');
        // Check if address is from the same network
        if (Address.isFromNetwork(recipientAddress, this._Wallet.network)) {
            // Get recipient account data from network
            return this._NetworkRequests.getAccountData(helpers.getHostname(this._Wallet.node), recipientAddress).then((data) => {
                    // Store recipient public key (needed to encrypt messages)
                    transferData.recipientPubKey = data.account.publicKey;
                    // Set the address to send to
                    transferData.recipient = recipientAddress;
                },
                (err) => {
                    this._Alert.getAccountDataError(err.data.message);
                    return;
                });
        } else {
            // Error
            this._Alert.invalidAddressForNetwork(recipientAddress, this._Wallet.network);
            // Reset recipient data
            throw "invalidAddressForNetwork";
        }
    }

    /**
     * send(entity) Sends a transaction to the network based on an entity
     *
     * @param {object} entity - The prepared transaction object
     * @param {object} common - A password/privateKey object
     *
     * @return {promise} - An announce transaction promise of the NetworkRequests service
     */
    send(entity, common){
        if(!common.privateKey){
            this._Alert.invalidPassword();
            throw "privateKey is empty";
        }
        // Construct transaction byte array, sign and broadcast it to the network
        return this._Transactions.serializeAndAnnounceTransaction(entity, common).then((result) => {
            // Check status
            if (result.status === 200) {
                // If code >= 2, it's an error
                if (result.data.code >= 2) {
                    this._Alert.transactionError(result.data.message);
                    throw(result.data.message);
                } else {
                    if(this.disableSuccessAlert == false){
                        this._Alert.transactionSuccess();
                    }
                }
            }
        },
        (err) => {
            this._Alert.transactionError('Failed ' + err.data.error + " " + err.data.message);
            throw(err);
        });
    }

    /**
     * sendMessage(recipientAccount, message, common) Sends a minimal transaction containing a message to poin 
     *
     * @param {object} receiver - Transaction receiver's account
     * @param {string} message - Message to be sent
     * @param {object} common -  password/privateKey object
     *
     * @return {promise} - An announce transaction promise of the NetworkRequests service
     */
    sendMessage(receiver, message, common, amount) {

        if(!amount) amount = 0;

        var transferData = {};
        // Check that the receiver is a valid account and process it's public key
        transferData.recipient = receiver;
        this.processTxData(transferData);
        // transferData.receiverPubKey is set now

        transferData.amount = amount;
        transferData.message = message;
        transferData.encryptMessage = false; // Maybe better to encrypt?
        transferData.isMultisig = false;
        transferData.isMosaicTransfer = false;

        // Build the entity to be sent
        let entity = this._Transactions.prepareTransfer(common, transferData, this.mosaicsMetaData);
        return this.send(entity, common);
    }

    /**
     * sendMosaic(recipient, namespaceId, mosaics, amount, common, options) Sends a minimal transaction containing a mosaic and optionally a message and some xem
     *
     * @param {object} recipient - Transaction receiver's account
     * @param {string} namespaceId - Mosaic's namespace name
     * @param {string} mosaic - Mosaic's name
     * @param {integer} amount - Amount of mosaics to transfer
     * @param {object} common -  password/privateKey object
     * @param {object} options - An object that can contain: options.xem and options.message
     *
     * @return {promise} - An announce transaction promise of the NetworkRequests service
     */
    sendMosaic(recipient, namespaceId, mosaics, amount, common, options) {
        var xem = ""
        var message = ""
        if(options.xem) xem = options.xem;
        if(options.message) message = options.message;

        var transferData = {}

        // Check that the recipient is a valid account and process it's public key
        transferData.recipient = recipient;
        this.processTxData(transferData);
        // transferData.recipientPubKey is set now

        // In case of mosaic transfer amount is used as multiplier, set to 1 as default
        transferData.amount = 1;

        // Other necessary
        transferData.message = message;
        transferData.encryptMessage = false;

        // Setup mosaics information
        transferData.mosaics = [{
            'mosaicId': {
                'namespaceId': namespaceId,
                'name': mosaics
            },
            'quantity': amount,
        }];

        if(xem > 0){
            transferData.mosaics[1] = {
                'mosaicId': {
                    'namespaceId': "nem",
                    'name': 'xem'
                },
                'quantity': xem,
            }
        }

        // Build the entity to send
        let entity = this._Transactions.prepareTransfer(common, transferData, this.mosaicsMetaData);
        return this.send(entity, common);
    }

    /**
     * createNewAccount() creates a new account using a random seed
     */
    createNewAccount() {
        var deferred = this._$q.defer();
        var promise = deferred.promise;
        
        var rk = CryptoHelpers.randomKey();
        var seed = this._Wallet.currentAccount.address+" is creating an account from "+rk;
        // console.log("creating a HDW from "+seed);

        // Create the brain wallet from the seed
        this._WalletBuilder.createBrainWallet(seed, seed, this._Wallet.network).then((wallet) => {
            this._$timeout(() => {
                if (wallet) {
                    var mainAccount = {};
                    mainAccount.address = wallet.accounts[0].address;
                    mainAccount.password = seed;
                    mainAccount.privateKey = "";

                    // Decrypt/generate private key and check it. Returned private key is contained into mainAccount
                    if (!CryptoHelpers.passwordToPrivatekeyClear(mainAccount, wallet.accounts[0], wallet.accounts[0].algo, false)) {
                        this._Alert.invalidPassword();
                        deferred.reject(false);
                    } 
                    mainAccount.publicKey = KeyPair.create(mainAccount.privateKey).publicKey.toString();
                    deferred.resolve(mainAccount);
                }
            }, 10);
        },
        (err) => {
            this._Alert.createWalletFailed(err);
            deferred.reject(false);
            console.log(err);
        });
        return deferred.promise;
    }

    /**
     * isUnusedAccount(account) Checks that the account has never received any transaction
     *
     * @return {promise} - A promise that will return true or throw false if it has
     *
     */
    isUnusedAccount(account){
        this._NetworkRequests.getAllTransactions(helpers.getHostname(this._Wallet.node), account.address).then((result)=>{
            if(result.data.length) {
                return true;
            }else{
                throw false;
            }
        });
    }

    /**
     * createEmptyAccount() Creates a HD account and validates that it has never been used before
     *
     * @return {promise} - A promise that will return a brand new account
     *
     */
    createEmptyAccount(){
        var deferred = this._$q.defer();
        var promise = deferred.promise;
        promise.reject(false);
        var maxAttempts = 5;
        for(var i=0; i<maxAttempts; i++) {
            // Tries to create a new account, if it has a transaction

            promise = promise.catch(this.createNewAccount).then(this.isUnusedAccount).catch(helpers.rejectDelay);
        }
        return promise;
    }

    sendOwnedBy(subjectFullAccount, ownerAccountAddress) {

        return this._NetworkRequests.getAccountData(helpers.getHostname(this._Wallet.node), ownerAccountAddress).then((account)=>{
            // Obtain public key and address
            let owner = {};
            owner.address = account.account.address;
            owner.publicKey = account.account.publicKey;

            // Set current account as owner
            let ownersArray = [{}];
            ownersArray[0].pubKey = owner.publicKey;

            // Set transferData
            let transferData = {};

            transferData.minCosigs = 1;
            transferData.accountToConvert = subjectFullAccount.publicKey; // OJO!!!!
            transferData.cosignatoryAddress = owner.address;
            transferData.multisigPubKey = subjectFullAccount.publicKey;
            
            // Build the entity to send
            let entity = this._Transactions._constructAggregate(transferData, ownersArray);
            return this.send(entity, subjectFullAccount);
        },(err)=>{
            this._Alert.getAccountDataError(err);
            throw err;
        });
    }

    /**
     * ownsMosaic(address,namespace, mosaic) Checks if address owns any mosaics from namespace:mosaic
     *
     * @param {string} address - NEM Address to check for the mosaic
     * @param {string} namespaceId - Mosaic's namespace name
     * @param {string} mosaic - Mosaic's name
     *
     * @return {promise} - A promise of the NetworkRequests service that returns wether if address owns any mosaics from namespace:mosaic or not
     */
    ownsMosaic(address,namespace, mosaic){
        var deferred = this._$q.defer();
        var promise = deferred.promise;
        this._NetworkRequests.getMosaicsDefinitions(helpers.getHostname(this._Wallet.node), address).then((result)=>{
            let owns = false;
            if(result.data.length) {
                for (let i = 0; i < result.data.length; ++i) {
                    let rNamespace = result.data[i].id.namespaceId;
                    let rMosaic = result.data[i].id.name;   
                    if(namespace == rNamespace && mosaic == rMosaic){
                        owns = true;
                    }
                }
            }
            deferred.resolve(owns);
        }, 
        (err) => {
            if(err.status === -1) {
                this._Alert.connectionError();
            } else {
                this._Alert.errorGetMosaicsDefintions(err.data.message);
            }
        });
        return deferred.promise;
    }
    

}

export default nemUtils;