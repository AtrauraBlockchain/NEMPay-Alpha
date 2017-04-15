function ShowNetworkStatus(DataBridge) {
    'ngInject';

    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            scope.DataBridge = DataBridge;

            scope.$watch('DataBridge.connectionStatus', function(val) {
                // If user detected
                if (val) {
                    element.css({
                        color: 'green'
                    });
                } else {
                    element.css({
                        color: 'red'
                    })
                }
            });

        }
    };
}

export default ShowNetworkStatus;
