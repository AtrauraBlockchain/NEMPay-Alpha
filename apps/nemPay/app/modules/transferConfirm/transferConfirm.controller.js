import helpers from '../../utils/helpers';
import Address from '../../utils/Address';
import CryptoHelpers from '../../utils/CryptoHelpers';
import Network from '../../utils/Network';

class TransferConfirmCtrl {
    constructor($location, Wallet, Alert, Transactions, NetworkRequests, DataBridge, $stateParams, $state, $ionicLoading, $timeout, $scope, $ionicPopover) {
        'ngInject';

        // Alert service
        this._Alert = Alert;
        // $location to redirect
        this._location = $location;
        // NetworkRequests service
        this._NetworkRequests = NetworkRequests;
        // Wallet service
        this._Wallet = Wallet;
        // Transactions service
        this._Transactions = Transactions;
        // DataBridge service
        this._DataBridge = DataBridge;
        
        this._state = $state;

       

        // If no wallet show alert and redirect to home
        if (!this._Wallet.current) {
            this._Alert.noWalletLoaded();
            this._location.path('/');
            return;
        }
        
        if(window.Connection) {
            if(navigator.connection.type == Connection.NONE) {
            this._Alert.noInternet();
            this._location.path('/');

            }
        }

        /**
         * Default transfer transaction properties 
         */
        this.formData = {};
        // Alias or address user type in
        // Cleaned recipient from @alias or input
        this.formData.recipient = $stateParams.to;
        console.log($stateParams.to);
        this.formData.recipientPubKey = '';
        if($stateParams.message){
            this.formData.message =    $stateParams.message;
        }
        else this.formData.message = '';
        this.formData.amount = $stateParams.amount;
        this.formData.fee = 0;
        this.formData.encryptMessage = false;
        // Multisig data
        this.formData.innerFee = 0;
        this.formData.isMultisig = false;
        this.formData.multisigAccount = this._DataBridge.accountData.meta.cosignatoryOf.length == 0 ? '' : this._DataBridge.accountData.meta.cosignatoryOf[0];
        // Mosaics data
        // Counter for mosaic gid
        this.counter = 1;
        this.formData.mosaics = null;
        this.mosaicsMetaData = this._DataBridge.mosaicDefinitionMetaDataPair;
        this.formData.isMosaicTransfer = false;
        this.currentAccountMosaicNames = [];
        this.selectedMosaic = $stateParams.currency;
        this.unit = this.selectedMosaic.split(":")[1];

        // Mosaics data for current account
        this.currentAccountMosaicData = "";

        // Invoice mode not active by default
        this.invoice = false;
        // Plain amount that'll be converted to micro XEM
        this.rawAmountInvoice = 0;

        // Alias address empty by default
        this.aliasAddress = $stateParams.alias;

        // Needed to prevent user to click twice on send when already processing
        this.okPressed = false;

        // Object to contain our password & private key data.
        this.common = {
            'password': '',
            'privateKey': '',
        };

        this.updateFees();
    }

    /**
     * updateFees() Update transaction fee
     */
    updateFees() {
        let entity = this._Transactions.prepareTransfer(this.common, this.formData, this.mosaicsMetaData);
        if (this.formData.isMultisig) {
            this.formData.innerFee = entity.otherTrans.fee;
        } else {
             this.formData.innerFee = 0;
        }
        this.formData.fee = entity.fee;
    }

    /**
     * resetRecipientData() Reset data stored for recipient
     */
    resetRecipientData() {
        // Reset public key data
        this.formData.recipientPubKey = '';
        // Hide alias address input field
        this.showAlias = false;
        // Reset cleaned recipient address
        this.formData.recipient = '';
        // Encrypt message set to false
        this.formData.encryptMessage = false;
    }



    _send(entity, common){
        // Construct transaction byte array, sign and broadcast it to the network
        return this._Transactions.serializeAndAnnounceTransaction(entity, common).then((result) => {
            // Check status
            if (result.status === 200) {
                // If code >= 2, it's an error
                if (result.data.code >= 2) {
                    this._Alert.transactionError(result.data.message);
                } else {
                    this._Alert.transactionSuccess();
                }
            }
        },
        (err) => {
            // Enable send button
            this.okPressed = false;
            this._Alert.transactionError('Failed ' + err.data.error + " " + err.data.message);
        });
    }


        /**
     * _sendMosaic(recipient, namespaceId, mosaics, amount) Sends a minimal transaction containing one or more mosaics 
     */
    _sendMosaic(recipient, namespaceId, mosaics, amount, common, options) {

        var message = ""
        if(options.message) message = options.message;

        var transferData = {}
        
        // Check that the recipient is a valid account and process it's public key
        transferData.recipient = recipient;

        // In case of mosaic transfer amount is used as multiplier, set to 1 as default
        transferData.amount = 1;

        // transferData.recipientPubKey is set now
        if(namespaceId == "nem" && mosaics =="xem"){
            transferData.amount = amount;
        }

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
        if(namespaceId == "nem" && mosaics =="xem"){
          transferData.mosaics = [];      
        }

        // Build the entity to send
        let entity = this._Transactions.prepareTransfer(common, transferData, this.mosaicsMetaData);
        return this._send(entity, common);
    }

    /**
     * send() Build and broadcast the transaction to the network
     */
    send() {
        // Disable send button;
        this.okPressed = true;

        // Decrypt/generate private key and check it. Returned private key is contained into this.common
        if (!CryptoHelpers.passwordToPrivatekeyClear(this.common, this._Wallet.currentAccount, this._Wallet.algo, true)) {
            this._Alert.invalidPassword();
            // Enable send button
            this.okPressed = false;
            return;
        } else if (!CryptoHelpers.checkAddress(this.common.privateKey, this._Wallet.network, this._Wallet.currentAccount.address)) {
            this._Alert.invalidPassword();
            // Enable send button
            this.okPressed = false;
            return;
        }

        // Construct transaction byte array, sign and broadcast it to the network
        var namespacemosaic = this.selectedMosaic.split(":");
         this.options = {};
         this.options.message = this.formData.message;
        this._sendMosaic(this.formData.recipient, namespacemosaic[0], namespacemosaic[1], this.formData.amount, this.common, this.options).then((data)=>{
            this._state.go('app.balance');
        },
            (err) => {

            });
    }

}

export default TransferConfirmCtrl;