class BalanceCtrl {
    constructor(Wallet, Alert, $location, DataBridge, $scope, $filter, $state, Transactions, NetworkRequests) {
        'ngInject';
        
        // Alert service
        this._Alert = Alert;
        // Filters
        this._$filter = $filter;
        // $location to redirect
        this._location = $location;

        this._$state = $state;

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

    };

    moveToTransfer(mos){
        this._$state.go('app.transfer',
            {selectedMosaic: mos.mosaicId.namespaceId+':'+mos.mosaicId.name}
            )
    }

}

export default BalanceCtrl;