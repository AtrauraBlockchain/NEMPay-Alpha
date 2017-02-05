import angular from 'angular';

// Create the module where our functionality can attach to
let balanceModule = angular.module('app.balance', []);

// Include our UI-Router config settings
import BalanceConfig from './balance.config';
balanceModule.config(BalanceConfig);

// Controllers
import BalanceCtrl from './balance.controller';
balanceModule.controller('BalanceCtrl', BalanceCtrl);


export default balanceModule;
