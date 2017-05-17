import helpers from '../../utils/helpers';
import Address from '../../utils/Address';
import CryptoHelpers from '../../utils/CryptoHelpers';
import Network from '../../utils/Network';

class TransferConfirmCtrl {
    constructor($location, Wallet, Alert, Transactions, NetworkRequests, DataBridge, $state, $ionicLoading, $timeout) {
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

        this._$ionicLoading = $ionicLoading;

        this._$timeout = $timeout;

        // If no wallet show alert and redirect to home
        if (!this._Wallet.current) {
            this._Alert.noWalletLoaded();
            this._location.path('/');
            return;
        }

        /**
         * Default transfer transaction properties
         */
        this.formData = {};
        this.formData.recipient = this._state.params.to;
        this.formData.recipientPubKey = '';

        if(this._state.params.message){
            this.formData.message =    this._state.params.message;
        }
        else this.formData.message = '';

        this.selectedMosaic = this._state.params.mosaic;

        this.rawAmount = this._state.params.amount;
        //if is nem:xem, set amount
        if(this.selectedMosaic == 'nem:xem'){

            this.formData.amount = this._state.params.amount;
        }
        else this.formData.amount = 1; // Always send 1 xem in amount when sending mosaic

        var namespace_mosaic = this.selectedMosaic.split(":");

        this.formData.mosaics = [{
            'mosaicId': {
                'namespaceId': namespace_mosaic[0],
                'name': namespace_mosaic[1]
            },
            'quantity': this._state.params.amount * Math.pow(10, this._state.params.divisibility),
            'gid': 'mos_id_2' // If we are sending more than one mosaic we should increase the counter and every mosaic must have different gid starting at 2
        }];

        console.log(this._state.params.amount * Math.pow(10, this._state.params.divisibility));

        // no mosaics if nem or xem transfered
        if(this.selectedMosaic == 'nem:xem'){
            this.formData.mosaics = [];
        }

        this.formData.fee = 0;
        this.formData.encryptMessage = false;

        // Multisig data
        this.formData.innerFee = 0;
        this.formData.isMultisig = false;
        this.formData.multisigAccount = this._DataBridge.accountData.meta.cosignatoryOf.length == 0 ? '' : this._DataBridge.accountData.meta.cosignatoryOf[0];

        // Mosaics data
        // Counter for mosaic gid
        this.mosaicsMetaData = this._DataBridge.mosaicDefinitionMetaDataPair;

        if(this.selectedMosaic == 'nem:xem'){
            this.formData.isMosaicTransfer = false;
        }else {
            this.formData.isMosaicTransfer = true;
            this.formData.mosaicSelected = this.mosaicsMetaData[this.selectedMosaic];
        }

        this.currentAccountMosaicNames = [];

        // Mosaics data for current account
        this.currentAccountMosaicData = "";


        // Alias address empty by default
        this.aliasAddress = this._state.params.alias;

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
        console.log("Entity");
        console.log(entity);
        if (this.formData.isMultisig) {
            this.formData.innerFee = entity.otherTrans.fee;
        } else {
            this.formData.innerFee = 0;
        }
        this.formData.fee = entity.fee;
        if (this.selectedMosaic != 'nem:xem') this.formData.fee = this.formData.fee + 1000000;
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


    /**
     * checkAccess() Ensure that the user is authentic by checking his password and setting the private key to this.common
     */
    checkAccess(){
        // Decrypt/generate private key and check it. Returned private key is contained into this.common
        if (!CryptoHelpers.passwordToPrivatekeyClear(this.common, this._Wallet.currentAccount, this._Wallet.algo, false)) {
            this._Alert.invalidPassword();
            return false;
        } else if (!CryptoHelpers.checkAddress(this.common.privateKey, this._Wallet.network, this._Wallet.currentAccount.address)) {
            this._Alert.invalidPassword();
            return false;
        }
        return true;
    }


    /**
     * _sendMosaic(recipient, namespaceId, mosaics, amount) Sends a minimal transaction containing one or more mosaics
     */

    /**
     * send() Build and broadcast the transaction to the network
     */
    send() {
        // Disable send button;
        this.okPressed = true;
        this._$ionicLoading.show( {
            template: '<span>Sending assets...</span>',
            }
        );
        this._$timeout(() => {

            if(this.checkAccess()) {
            // Construct transaction byte array, sign and broadcast it to the network

            // Build the entity to send
            let entity = this._Transactions.prepareTransfer(this.common, this.formData, this.mosaicsMetaData);
            console.log("entity");
            console.log(entity);
            // Construct transaction byte array, sign and broadcast it to the network

                return this._Transactions.serializeAndAnnounceTransaction(entity, this.common).then((result) => {
                    console.log(result);

                    // Check status
                    if (result.status === 200) {
                        // If code >= 2, it's an error
                        if (result.data.code >= 2) {
                            this._Alert.transactionError(result.data.message);
                        } else {
                            this._Alert.transactionSuccess();
                        }
                        this.okPressed = false;
                        this._$ionicLoading.hide();
                        this._state.go('app.balance');

                    }
                },
                (err) => {
                    console.log(err);
                    this.okPressed = false;
                    this._$ionicLoading.hide();
                    this._Alert.transactionError('Failed ' + err.data.error + " " + err.data.message);
                });
        }
        else{
            this.okPressed = false;
            this._$ionicLoading.hide();
        }
        }, 10);
    }

    /**
     * onEnter(keyEvent) On press enter, tries to login
     */
    onEnter(keyEvent) {
        if (keyEvent.which === 13){

            if(this.okPressed || !this.common.password.length || this.formData.recipient.length !== 40 || this.formData.encryptMessage && this.formData.recipientPubKey.length !== 64 || this.formData.isMosaicTransfer && !this.formData.mosaics.length){
                this._Alert.invalidPassword();
            }
            else {
                this.moveToTransferConfirm();
            }
        }
    }

}

export default TransferConfirmCtrl;