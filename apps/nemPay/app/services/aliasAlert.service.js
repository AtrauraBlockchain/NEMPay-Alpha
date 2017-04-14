export default class AliasAlert {
    constructor(ngToast, $filter) {
        'ngInject';

        // ngToast provider
        this._ngToast = ngToast;
        // Filters
        this._$filter = $filter;
    }

    /***
     * Error alerts
     */
    aliasError(message) {
        this._ngToast.create({
            content: message,
            className: 'danger'
        });
    }

    alreadyExistsError(alias) {
        this._ngToast.create({
            content: "@"+alias + this._$filter('translate')('ALERT_ALIAS_ALREADY_EXISTS_ERROR'),
            className: 'danger'
        });
    }

    isNamespaceError(alias) {
        this._ngToast.create({
            content: alias + this._$filter('translate')('ALERT_ALIAS_IS_NAMESPACE_ERROR'),
            className: 'danger'
        });
    }

    unexpectedError(message) {
        console.log(message);
        this._ngToast.create({
            content: this._$filter('translate')('ALERT_ALIAS_UNEXPECTED_ERROR')+" - "+message,
            className: 'danger',
            timeout: 10000
        });
    }

    wrongFormat(alias) {
        this._ngToast.create({
            content: this._$filter('translate')('ALERT_ALIAS_WRONG_FORMAT_ERROR'),
            className: 'danger'
        });
    }

    nsaliasNotReady() {
        this._ngToast.create({
            content: this._$filter('translate')('ALERT_ALIAS_NS_NOT_READY_ERROR'),
            className: 'danger'
        });
    }

    aliasIsTooLongError(alias){
        this._ngToast.create({
            content: this._$filter('translate')('ALERT_ALIAS_IS_TOO_LONG_ERROR')+alias.length,
            className: 'danger'
        });
    }


    insuficientBalanceError(){
        this._ngToast.create({
            content: this._$filter('translate')('ALERT_ALIAS_INSUFICIENT_FUNDS_ERROR'),
            className: 'danger'
        });
    }


    /***
     * Warning alerts
     */
    doesNotExistWarning(alias) {
        this._ngToast.create({
            content: "@"+alias + this._$filter("translate")("ALERT_ALIAS_DOES_NOT_EXIST_WARNING"),
            className: 'warning'
        });
    }

    /***
     * Success alerts
     */
    setAliasSuccess(alias, account, pointer) {
        this._ngToast.create({
            content: "@" + alias + this._$filter('translate')('ALERT_SET_ALIAS_SUCCESS')+account+this._$filter('translate')('ALERT_SET_ALIAS_SUCCESS2')+pointer+this._$filter('translate')('ALERT_SET_ALIAS_SUCCESS3') ,
            className: 'success',
            timeout: 10000
        });
    }
}