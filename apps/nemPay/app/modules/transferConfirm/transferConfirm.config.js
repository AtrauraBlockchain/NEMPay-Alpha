function TransferConfirmConfig($stateProvider) {
    'ngInject';

    $stateProvider
        .state('app.transferConfirm', {
            url: '/transfer-confirm/:to?alias?amount?currency?message',
            controller: 'TransferConfirmCtrl',
            controllerAs: '$ctrl',
            templateUrl: 'modules/transferConfirm/transferConfirm.html',
            title: 'Send & Receive'
        });

};

export default TransferConfirmConfig;