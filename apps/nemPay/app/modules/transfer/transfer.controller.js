import helpers from '../../../../nanowallet/src/app/utils/helpers';
import Address from '../../../../nanowallet/src/app/utils/Address';
import CryptoHelpers from '../../../../nanowallet/src/app/utils/CryptoHelpers';
import Network from '../../../../nanowallet/src/app/utils/Network';

class TransferCtrl {
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
        this._state = $state;


        $ionicLoading.show();

         $timeout(function () {
            $ionicLoading.hide();
        }, 1000);


        /**
         * Default transfer transaction properties 
         */
        this.formData = {};
        // Alias or address user type in
        this.formData.rawRecipient = '';
        // Cleaned recipient from @alias or input
        this.formData.recipient = '';
        this.formData.recipientPubKey = '';
        this.formData.message = '';
        this.formData.amount = 0;
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
        this.selectedMosaic = "nem:xem";
        // Mosaics data for current account
        this.currentAccountMosaicData = "";

        // Invoice mode not active by default
        this.invoice = false;
        // Plain amount that'll be converted to micro XEM
        this.rawAmountInvoice = 0;

        // Alias address empty by default
        this.aliasAddress = '';
        // Not showing alias address input by default
        this.showAlias = false;
        // Needed to prevent user to click twice on send when already processing
        this.okPressed = false;

        // Init account mosaics
        this.updateCurrentAccountMosaics();

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
            // Clean namespace name of the @
            let nsForLookup = this.formData.rawRecipient.substring(1);
            // Get namespace info and account data from network
            this.getRecipientDataFromAlias(nsForLookup)
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

    /**
     * getRecipientDataFromAlias() Get recipient account data from network using @alias
     * 
     * @param alias: The recipient alias (namespace)
     */
    getRecipientDataFromAlias(alias) {
        return this._NetworkRequests.getNamespacesById(helpers.getHostname(this._Wallet.node), alias).then((data) => {
                        // Set the alias address
                        this.aliasAddress = data.owner;
                        // Show the read-only input containing alias address
                        this.showAlias = true;
                        // Check if address is from network
                        if (Address.isFromNetwork(this.aliasAddress, this._Wallet.network)) {
                            // Get recipient account data from network
                            this.getRecipientData(this.aliasAddress);
                        } else {
                            // Unexpected error, this alert will not dismiss on timeout
                            this._Alert.invalidAddressForNetwork(this.aliasAddress, this._Wallet.network);
                            // Reset recipient data
                            this.resetRecipientData();
                            return;
                        }
                    },
                    (err) => {
                        this._Alert.getNamespacesByIdError(err.data.message);
                        // Reset recipient data
                        this.resetRecipientData();
                        return;
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
            this.selectedMosaic = "nem:xem";
    }

    updateMosaicUnitToTransfer() {
                  
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
        var alias = '';
        if(this.showAlias){
            alias = this.formData.rawRecipient;
        }
        this._state.go('app.transferConfirm', 
            {to: this.formData.recipient, 
            alias: alias,
            amount: this.formData.amount, 
            currency: this.selectedMosaic, 
            message: this.formData.message})
    }

}

export default TransferCtrl;