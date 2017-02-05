import angular from 'angular';

// Create the module where our functionality can attach to
let loadWalletModule = angular.module('app.loadWallet', []);

// Include our UI-Router config settings
import LoadWalletConfig from './loadWallet.config';
loadWalletModule.config(LoadWalletConfig);

// Controllers
import LoadWalletCtrl from './loadWallet.controller';
loadWalletModule.controller('LoadWalletCtrl', LoadWalletCtrl);

export default loadWalletModule;
