import helpers from '../../utils/helpers';
import Address from '../../utils/Address';
import CryptoHelpers from '../../utils/CryptoHelpers';
import Network from '../../utils/Network';


class TransferTransactionCtrl {

    constructor($state, $localStorage, $location, $scope, Wallet, Alert, Transactions, NetworkRequests, DataBridge, nemUtils, Alias) {

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

        // Common NEM Functions
        this._nemUtils = nemUtils;
        // Alias Service
        this._Alias = Alias;

        // $state
        this._$state = $state;
        //Local storage
        this._storage = $localStorage;
        // use helpers in view
        this._helpers = helpers;

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
        // Alias or address user type in
        this.formData.rawRecipient = this._$state.params.address.length ? this._$state.params.address : '';
        if(this.formData.rawRecipient.length) {
            this.processRecipientInput();
        }
        // Cleaned recipient from @alias or input
        this.formData.recipient = '';
        this.formData.recipientPubKey = '';
        this.formData.message = '';
        this.rawAmount = 0;
        this.formData.amount = 0;
        this.formData.encryptMessage = false;

        // Multisig data
        this.formData.isMultisig = false;
        this.formData.multisigAccount = this._DataBridge.accountData.meta.cosignatoryOf.length == 0 ? '' : this._DataBridge.accountData.meta.cosignatoryOf[0];

        // Mosaics data
        this.formData.mosaics = null;
        this.mosaicsMetaData = this._DataBridge.mosaicDefinitionMetaDataPair;
        this.formData.isMosaicTransfer = false;
        this.currentAccountMosaicNames = [];
        this.selectedMosaic = this._$state.params.selectedMosaic;

        // Mosaics data for current account
        this.currentAccountMosaicData = "";

        // Alias address empty by default
        this.aliasAddress = '';
        // Not showing alias address input by default
        this.showAlias = false;
        // Needed to prevent user to click twice on send when already processing
        this.okPressed = false;

        // Object to contain our password & private key data.
        this.common = {
            'password': '',
            'privateKey': '',
        };

        // Init account mosaics
        this.updateCurrentAccountMosaics();

        // NEM ALIAS SYSTEM
        this.alias = "";
        this.hasAlias = false;
        this.showAliasField = false;

        // Address Book
        this.processRecipientInput();

    }


    /**
     * processRecipientInput() Process recipient input and get data from network
     *
     * @note: I'm using debounce in view to get data typed with a bit of delay,
     * it limits network requests
     */
    processRecipientInput() {
        // Check if value is an alias
        let isAlias = (this.formData.rawRecipient.lastIndexOf("@", 0) === 0);
        // Reset recipient data
        this.resetRecipientData();

        // return if no value or address length < to min address length AND not an alias
        if (!this.formData.rawRecipient || this.formData.rawRecipient.length < 40 && !isAlias) {
            return;
        }

        // Get recipient data depending of address or alias used
        if (isAlias) {
            // Get alias info and account data from network
            this.getRecipientDataFromAlias(this.formData.rawRecipient);
        } else { // Normal address used
            // Clean address
            let recipientAddress = this.formData.rawRecipient.toUpperCase().replace(/-/g, '');
            // Check if address is from network
            if (Address.isFromNetwork(recipientAddress, this._Wallet.network)) {
                // Get recipient account data from network
                this.getRecipientData(recipientAddress);
            } else {
                // Error
                this._Alert.invalidAddressForNetwork(recipientAddress, this._Wallet.network);
                // Reset recipient data
                this.resetRecipientData();
                return;
            }
        }

    }

    /**
     * getRecipientData() Get recipient account data from network
     *
     * @param address: The recipient address
     */
    getRecipientData(address) {
        return this._NetworkRequests.getAccountData(helpers.getHostname(this._Wallet.node), address).then((data) => {
                // Store recipient public key (needed to encrypt messages)
                this.formData.recipientPubKey = data.account.publicKey;
                //console.log(this.formData.recipientPubKey)
                // Set the address to send to
                this.formData.recipient = address;
            },
            (err) => {
                this._Alert.getAccountDataError(err.data.message);
                // Reset recipient data
                this.resetRecipientData();
                return;
            });
    }


    checkAddress(address){
        // Check if address is from network
        if (Address.isFromNetwork(address, this._Wallet.network)) {
            // Get recipient account data from network
            this.getRecipientData(address);
        } else {
            // Unexpected error, this alert will not dismiss on timeout
            this._Alert.invalidAddressForNetwork(address, this._Wallet.network);
            // Reset recipient data
            this.resetRecipientData();
            return;
        }
    }
    /**
     * getRecipientDataFromAlias() Get recipient account data from network using @alias
     *
     * @param alias: The recipient alias (NEM ALIAS SYSTEM)
     */
    getRecipientDataFromAlias(alias) {
        this._Alias.fetchAlias(alias).then((address)=>{
            if(address){
                // Set the alias address
                this.aliasAddress = address;
                // Show the read-only input containing alias address
                this.showAlias = true;
                // Check that address is from the network
                this.checkAddress(this.aliasAddress);
            }
        });
    }

    /**
     * updateCurrentAccountMosaics() Get current account mosaics names
     */
    updateCurrentAccountMosaics() {
        //Fix this.formData.multisigAccount error on logout
        if (null === this.formData.multisigAccount) {
            return;
        }
        // Get current account
        let acct = this._Wallet.currentAccount.address;
        if (this.formData.isMultisig) {
            // Use selected multisig
            acct = this.formData.multisigAccount.address;
        }
        // Set current account mosaics names if mosaicOwned is not undefined
        if (undefined !== this._DataBridge.mosaicOwned[acct]) {
            this.currentAccountMosaicData = this._DataBridge.mosaicOwned[acct];
            this.currentAccountMosaicNames = Object.keys(this._DataBridge.mosaicOwned[acct]).sort();
        } else {
            this.currentAccountMosaicNames = ["nem:xem"];
            this.currentAccountMosaicData = "";
        }
        // Default selected is nem:xem
        this.selectedMosaic = this._$state.params.selectedMosaic;
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

    moveToTransferConfirm(){
        if (window.cordova) cordova.plugins.Keyboard.close();
        var alias = '';
        if(this.showAlias){
            alias = this.formData.rawRecipient;
        }
        this._$state.go('app.transferConfirm',
            {to: this.formData.recipient,
                alias: alias,
                amount: this.formData.amount,
                mosaic: this.selectedMosaic,
                divisibility: this.mosaicsMetaData[this.selectedMosaic].mosaicDefinition.properties[0].value,
                message: this.formData.message})
    }

    /**
     * onEnter(keyEvent) On press enter, tries to login
     */
    onEnter(keyEvent) {
        if (keyEvent.which === 13){
            if(this.okPressed || this.formData.recipient.length !== 40 || this.formData.encryptMessage && this.formData.recipientPubKey.length !== 64 || this.formData.isMosaicTransfer && !this.formData.mosaics.length || this.formData.amount == 0){
                this._Alert.missingFormData();
            }
            else {
                this.moveToTransferConfirm();
            }
        }
    }

    onInitSelector(){
        return this._$state.params.selectedMosaic;
    }

}

export default TransferTransactionCtrl;



