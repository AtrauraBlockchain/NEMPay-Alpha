import helpers from '../../utils/helpers';
import CryptoHelpers from '../../utils/CryptoHelpers';
import Network from '../../utils/Network';
import Address from '../../utils/Address';
import Keypair from '../../utils/KeyPair';

class AccountCtrl {
    constructor(AppConstants, $scope, $q, $filter, $localStorage, $location, Alert, NetworkRequests, Wallet, WalletBuilder, Transactions, Connector, DataBridge, $timeout, $cordovaSocialSharing, nemUtils, Alias, AliasAlert) {
        'ngInject';


        this._q = $q;
        this._filter = $filter;

        // Application constants
        this._AppConstants = AppConstants;
        // Wallet service
        this._Wallet = Wallet;
        // Wallet Builder service
        this._WalletBuilder = WalletBuilder;

        // $location to redirect
        this._$location = $location;
        //Local storage
        this._storage = $localStorage;
        // Alert service
        this._Alert = Alert;

        // Connector service
        this._Connector = Connector;
        // DataBridge service
        this._DataBridge = DataBridge;
        // Transactions service
        this._Transactions = Transactions;
        // NetworkRequests service
        this._NetworkRequests = NetworkRequests;
        // $timeout for async digest
        this._$timeout = $timeout;

        // Common nem functions
        this._nemUtils = nemUtils;
        // Alias Service
        this._Alias = Alias;
        this._AliasAlert = AliasAlert;


        // Default account properties
        this.selectedWallet = '';
        this.moreThanOneAccount = false;

        // If no wallet show alert and redirect to home
        if (!this._Wallet.current) {
            this._Alert.noWalletLoaded();
            this._$location.path('/');
            return;
        }

        // Hide private key field by default
        this.showPrivateKeyField = false;

        // Empty default label for added account
        this.newAccountLabel = "";

        // Check number of accounts in wallet to show account selection in view
        this.checkNumberOfAccounts();

        //cordova social sharing plugin
        this._$cordovaSocialSharing = $cordovaSocialSharing;


        // Object to contain our password & private key data.
        this.common = {
            'password': '',
            'privateKey': ''
        };

        // Wallet model for QR
        // @note: need to handle labels
        this.WalletModelQR = {
            'nem': {
                'type': 1,
                'version': 1,
                'name': this._Wallet.current.name,
                'enc_priv': this._Wallet.currentAccount.encrypted,
                'iv': this._Wallet.currentAccount.iv,
                'indexes': Object.keys(this._Wallet.current.accounts).length,
                'accountLabels': []
            }
        };

        // Account info model for QR
        this.accountInfoModelQR = {
            "v": this._Wallet.network === Network.data.Testnet.id ? 1 : 2,
            "type": 1,
            "data": {
                "addr": this._Wallet.currentAccount.address,
                "name": this._Wallet.current.name
            }
        }

        // Generate QR using kjua lib
        this.encodeQrCode = function(text, type) {
            let qrCode = kjua({
                size: 256,
                text: text,
                fill: '#000',
                quiet: 0,
                ratio: 2,
            });
            if (type === "wallet") {
                $('#exportWalletQR').append(qrCode);
            } else if (type === "mobileWallet") {
                $('#mobileWalletForm').html("");
                $('#mobileWalletQR').append(qrCode);
            } else {
                $('#accountInfoQR').append(qrCode);
            }
        }

        // Stringify the wallet object for QR
        this.walletString = JSON.stringify(this.WalletModelQR);
        // Stringify the account info object for QR
        this.accountString = JSON.stringify(this.accountInfoModelQR);
        // Generate the QRs
        this.encodeQrCode(this.walletString, "wallet");
        this.encodeQrCode(this.accountString, "accountInfo");

        // NEM ALIAS SYSTEM
        this.ALIAS_ROOT_INDEX = this._Alias.getRootIndex();
        this.ALIAS_NAMESPACE_INDEX = this._Alias.getNamespaceIndex();

        this.alias = "";
        this.hasAlias = false;
        this.showAliasField = false;
        this.aliasSpinningButton = false;
        this.disableAliasSave = true;

        let temp_alias = this._Alias.getAlias();
        if(temp_alias != ""){
            this.hasAlias = true;
            this.showAliasField = true;
            this.alias = temp_alias;
        }

        $scope.$watch(() => this._Alias.ownAlias, (val) => {
            if(val){
                this.hasAlias = true;
                this.showAliasField = true;
                this.alias = val;
            }
            else{
                this.hasAlias = false;
                this.alias = "";
            }
        });
        this._Alias.fetchIndexes().then(()=>{this._Alias.fetchOwnAlias();});


    }

    isAliasAvaliable(){
        this.disableAliasSave = true;
        this.aliasSpinningButton = true;
        this._Alias.fetchAlias(this.alias).then((result)=>{
            this.aliasSpinningButton = false;
        if(!result){
            this.disableAliasSave = false;
        }
        else{
            this._AliasAlert.alreadyExistsError(this.alias);
        }
    });
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
     * Generate the mobile wallet QR
     */
    generateWalletQR() {
        this.showPrivateKeyField = this.checkAccess();
        let mobileKeys = CryptoHelpers.AES_PBKF2_encryption(this.common.password, this.common.privateKey)

        let QR = {
            "v": this._Wallet.network === Network.data.Testnet.id ? 1 : 2,
            "type":3,
            "data": {
                "name": this._Wallet.current.name,
                "priv_key": mobileKeys.encrypted,
                "salt": mobileKeys.salt
            }
        };

        let QRstring = JSON.stringify(QR);
        this.encodeQrCode(QRstring, "mobileWallet");
        this.clearSensitiveData();
    }

    /**
     * Reveal the private key
     */
    showPrivateKey() {
        this.showPrivateKeyField = this.checkAccess();
    }

    /**
     * Change current account
     *
     * @param {number} accountIndex - The account index in the wallet.accounts object
     */
    changeCurrentAccount(accountIndex) {
        // Close the connector
        this._DataBridge.connector.close()
        this._DataBridge.connectionStatus = false;
        // Reset DataBridge service properties
        this._DataBridge.reset();
        // Set the selected account
        this._Wallet.setWalletAccount(this._Wallet.current, accountIndex);
        // Connect
        let connector = this._Connector.create({
            'uri': this._Wallet.node
        }, this._Wallet.currentAccount.address);
        this._DataBridge.openConnection(connector);

        // We need to wait till the connection is ready but it's not a promise, so we simply wait.
        // Setup alias system
        this._Alias.reset().then(()=>{
            this.ALIAS_ROOT_INDEX = this._Alias.getRootIndex();
        this.ALIAS_NAMESPACE_INDEX = this._Alias.getNamespaceIndex();
        this.showAliasField = false;
        this.hasAlias = false;
        this.alias = this._Alias.getAlias();
        if(this.alias){
            this.hasAlias = true;
            this.showAlias = true;
        }
    });

        // Redirect to dashboard
        this._$location.path('/dashboard');
    }

    /**
     * Trigger download of the wallet
     *
     * @param {object} wallet - A wallet object
     */
    download(wallet) {
        if (!wallet) {
            this._Alert.errorWalletDownload();
            return;
        }
        // Wallet object string to word array
        let wordArray = CryptoJS.enc.Utf8.parse(JSON.stringify(wallet));
        // Word array to base64
        let base64 = CryptoJS.enc.Base64.stringify(wordArray);
        // Set download element attributes
        $("#downloadWallet").attr('href', 'data:application/octet-stream,' + base64);
        $("#downloadWallet").attr('download', wallet.name + '.wlt');
        // Simulate click to trigger download
        document.getElementById("downloadWallet").click();
    }

    /**
     * Check the number of accounts in wallet
     */
    checkNumberOfAccounts() {
        if (Object.keys(this._Wallet.current.accounts).length > 1) {
            this.moreThanOneAccount = true;
        }
    }

    /**
     * Add a new bip32 account into the wallet
     */
    addNewAccount() {
        // Verify password and generate/get the PK into this.common
        if(!this.checkAccess()){
            return;
        }
        // Current number of accounts in wallet + 1
        let newAccountIndex = Object.keys(this._Wallet.current.accounts).length;
        // Derive the account at new index
        CryptoHelpers.generateBIP32Data(this.common.privateKey, this.common.password, newAccountIndex, this._Wallet.network).then((data) => {
            let generatedAccount = data.address;
        let generatedPrivateKey = data.privateKey;
        // Generate the bip32 seed for the new account
        CryptoHelpers.generateBIP32Data(generatedPrivateKey, this.common.password, 0, this._Wallet.network).then((data) => {
            this._$timeout(() => {
            // Encrypt generated account's private key
            let encrypted = CryptoHelpers.encodePrivKey(generatedPrivateKey, this.common.password);
        // Build account object
        let obj = {
            "address": generatedAccount,
            "label": this.newAccountLabel,
            "child": data.publicKey,
            "encrypted": encrypted.ciphertext,
            "iv": encrypted.iv
        };
        // Set created object in wallet
        this._Wallet.current.accounts[newAccountIndex] = obj;
        // Update to show account selection
        this.checkNumberOfAccounts();
        // Show alert
        this._Alert.generateNewAccountSuccess();
        // Clean
        this.clearSensitiveData();
        // Hide modal
        $("#addAccountModal").modal('hide');
    }, 0)
    },
        (err) => {
            this._$timeout(() => {
                this._Alert.bip32GenerationFailed(err);
            return;
        }, 0);
        });
    },
        (err) => {
            this._$timeout(() => {
                this._Alert.derivationFromSeedFailed(err);
            return;
        }, 0);
        });
    }

    /**
     * Reset the common object
     */
    clearSensitiveData() {
        this.common = {
            'password': '',
            'privateKey': ''
        };
        this.showPrivateKeyField = false;
        this.newAccountLabel = "";
    }

    /**** NEM ALIAS SYSTEM ****/

    /**
     * Reveal the alias Field
     */
    showAlias() {
        if(this.checkAccess()){
            this.showAliasField = true;
        }
    }

    /**
     * Attempt to save the desired alias in this.alias as a valid alias
     */
    setAlias(){
        this.disableAliasSave = true;
        var currentAddress = this._Wallet.currentAccount.address;
        var message = "";
        var pointerAccount = "";


        // Alias cleanup: strip anything except for '.' and alphabetical characters
        let temp = this.alias.replace(/[^.A-Z0-9]/gi, "").toLowerCase();
        this.alias = temp.split(".")[0];

        // Initial checks that may forbid the operation move forward
        if(this._DataBridge.accountData.account.balance < 500){
            // This account has insufficient funds to perform the operation
            this._AliasAlert.insuficientBalanceError();
            this.disableAliasSave = false;
            return
        }else if(this.alias.length > 40){
            // Alias could hold up to 119 chars but for now we will only allow <40
            this._AliasAlert.aliasIsTooLongError(this.alias);
            this.disableAliasSave = false;
            return;
        }
        else if(temp.split(".")[1]){
            // Namespace aliases are not ready yet.
            this._AliasAlert.nsaliasNotReady();
            this.disableAliasSave = false;
            return;
        }

        // We don't want all the Alerts to pop up
        this._nemUtils.disableSuccessAlerts();
        this.aliasSpinningButton = true;

        console.log("// 0. Check if a namespace exists with the same name as the alias, we will always prioritize this on the system");
        this._NetworkRequests.getNamespacesById(helpers.getHostname(this._Wallet.node), this.alias).then((data) => {

            if(data.owner){
            throw "This alias is already a namespace";
        }
    }).catch((err)=>{ // We need to catch this since we are expecting getNamespacesById to fail

            if(err == "This alias is already a namespace"){
            this._AliasAlert.isNamespaceError(this.alias);
            throw "";
        }
    else{
            console.log("// 1. Check alias not in [RI]");
            return this._nemUtils.getFirstMessageWithString(this.ALIAS_ROOT_INDEX, this.alias+"=");
        }

    }).then((result)=>{
            if(!result || !result.length > 0){
            // Alias has not been set yet
            console.log("// 2. Generate a new and empty HDA pointer for alias [PU]");
            return this._nemUtils.createNewAccount();
        }
    else{
            throw "Alias already exists";
        }

    }).then((data)=>{
            console.log("// 3. Send message to [PU] with alias_owner=[ACCT]");
        pointerAccount = data;
        message = "alias_owner="+currentAddress;
        return this._nemUtils.sendMessage(pointerAccount.address, message, this.common, 22);

    }).then((data)=>{
            console.log("// 4. Own pointer by [RI]");
        return this._nemUtils.sendOwnedBy(pointerAccount, this.ALIAS_ROOT_INDEX);

    }).then((data)=>{
            console.log("// 5. Write to self NEMAS=alias");
        message = "alias="+this.alias;
        return this._nemUtils.sendMessage(currentAddress, message, this.common);

    }).then((data)=>{
            console.log("// 6. Send message to [RI] with alias=[PU] including 450xem");
        message = this.alias+"="+pointerAccount.address;
        return this._nemUtils.sendMessage(this.ALIAS_ROOT_INDEX, message, this.common, 450);

    }).then((data)=>{
            // The alias has been successfully created and linked to the current account
            this._AliasAlert.setAliasSuccess(this.alias, currentAddress, pointerAccount.address);
        this._nemUtils.enableSuccessAlerts();
        this.aliasSpinningButton = false;
        this.disableAliasSave = true;
        this.clearSensitiveData();

    }).catch((err)=>{
            if(err == "Alias already exists"){
            this._AliasAlert.alreadyExistsError(this.alias);
        }else if(err != ""){
            this._AliasAlert.unexpectedError(err);
        }
        this._nemUtils.enableSuccessAlerts();
        this.aliasSpinningButton = false;
        this.clearSensitiveData();
        this.disableAliasSave = false;
    });
    }

    /**
     * logout() Delete current wallet stored in Wallet service and redirect to home logged out
     */
    logout() {
        // Close connector
        this._DataBridge.connector.close();
        // Set connection status to false
        this._DataBridge.connectionStatus = false;
        // Show success alert
        this._Alert.successLogout();
        // Reset data in DataBridge service
        this._DataBridge.reset();
        // Reset data in Wallet service
        this._Wallet.reset();
        // Redirect to home
        this._$location.path('/')
    }


    shareAnywhere(){

        this._$cordovaSocialSharing.share(this._Wallet.currentAccount.address, "My Wallet address", "", "");
    }

}

export default AccountCtrl;