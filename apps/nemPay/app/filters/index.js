import angular from 'angular';

let filtersModule = angular.module('app.filtersnempay', []);

import Filters from './filters';

filtersModule.filter('fmtNemPayDate', Filters.fmtNemPayDate);

export default filtersModule;
