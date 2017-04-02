function LoadWalletConfig($stateProvider) {
    'ngInject';

    $stateProvider
        .state('app.loadWallet', {
            url: '/',
            controller: 'LoadWalletCtrl',
            controllerAs: '$ctrl',
            templateUrl: 'modules/loadWallet/loadWallet.html',
            title: 'Load Wallet',
            activetab: 'loadWallet'

        });

};

export default LoadWalletConfig;
