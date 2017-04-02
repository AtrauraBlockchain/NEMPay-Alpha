class BalanceCtrl {
    constructor(Wallet, Alert, $location, DataBridge, $scope, $filter, Transactions, NetworkRequests, $timeout, ionicMaterialInk, ionicMaterialMotion,$ionicPopover,$ionicLoading) {
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

        //menu
        var template = '<ion-popover-view> <ion-content><div class="list"><a ui-sref="app.balance" class="item">Balance</a><a ui-sref="app.transfer" class="item">Transfer</a><a ui-sref="app.transactions" class="item">Transactions</a><a ui-sref="app.account" class="item">Account</a></div></ion-content></ion-popover-view>';

        this.popover = $ionicPopover.fromTemplate(template, {
            scope: $scope
        });

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
        $ionicLoading.show({
            template: '<h3 class="text-center">Loading...</h3>',
            duration: 600
        }).then(function(){
            this.showNotAssetMessage = true;
        });

        //$timeout(wait, 600);

    };
    /**
     * openPopover() Opens popover
     */
    openPopover(event) {
        this.popover.show(event);
    };

    /**
     * closePopover() Closes popover
     */

    closePopover() {
        this.popover.hide();
    };

}

export default BalanceCtrl;