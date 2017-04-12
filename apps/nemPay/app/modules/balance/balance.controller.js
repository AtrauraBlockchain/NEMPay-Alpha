class BalanceCtrl {
    constructor(Wallet, Alert, $location, DataBridge, $scope, $filter, Transactions, NetworkRequests, $timeout, ionicMaterialInk, ionicMaterialMotion) {
        'ngInject';
        
        // Alert service
        this._Alert = Alert;
        // Filters
        this._$filter = $filter;
        // $location to redirect
        this._location = $location;
        // Wallet service
        this._Wallet = Wallet;
        // Transaction service
        this._Transactions = Transactions;
        // DataBridge service
        this._DataBridge = DataBridge;

        this._NetworkRequests = NetworkRequests;

        this.showNotAssetMessage = false;

        // If no wallet show alert and redirect to home
        if (!this._Wallet.current) {
            this._Alert.noWalletLoaded();
            this._location.path('/');
        }

        if(window.Connection) {
            if(navigator.connection.type == Connection.NONE) {
                this._Alert.noInternet();
                this._location.path('/');
            }
        }
    };

}

export default BalanceCtrl;