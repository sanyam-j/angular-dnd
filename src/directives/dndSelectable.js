module.directive('dndSelectable', ['$parse', function($parse){

    var defaults = {};

    Controller.$inject = ['$scope', '$attrs', '$element'];
    function Controller($scope, $attrs, $element) {
        var getterSelecting = $parse($attrs.dndModelSelecting), setterSelecting = getterSelecting.assign || noop;
        var getterSelected = $parse($attrs.dndModelSelected), setterSelected = getterSelected.assign || noop;
        var getterSelectable = $parse($attrs.dndSelectable), setterSelectable = getterSelectable.assign || noop;
        var onSelected = $parse($attrs.dndOnSelected);
        var onUnselected = $parse($attrs.dndOnUnselected);
        var onSelecting = $parse($attrs.dndOnSelecting);
        var onUnselecting = $parse($attrs.dndOnUnselecting);

        setterSelected($scope, false);
        setterSelecting($scope, false);

        this.getElement = function(){
            return $element;
        };

        this.isSelected = function(){
            return getterSelected($scope);
        };

        this.isSelecting = function(){
            return getterSelecting($scope);
        };

        this.isSelectable = function(){
            var selectable = getterSelectable($scope);
            return selectable === undefined || selectable;
        };

        this.toggleSelected = function(val){
            val = val === undefined ? !this.isSelected() : val;

            return val ? this.selected() : this.unselected();
        };

        this.selecting = function(){
            if (!this.isSelectable()) {
                return this;
            }

            setterSelecting($scope, true);
            onSelecting($scope);

            return this;
        };

        this.unselecting = function(){
            setterSelecting($scope, false);
            onUnselecting($scope);

            return this;
        };

        this.selected = function(){
            if (!this.isSelectable()) {
                return this;
            }

            setterSelected($scope, true);
            onSelected($scope);

            return this;
        };

        this.unselected = function(){
            setterSelected($scope, false);
            onUnselected($scope);

            return this;
        };

        this.hit = function(a){
            var b = this.rectCtrl.getClient();

            for(var key in b) {
                b[key] = parseFloat(b[key]);
            }

            b.bottom = b.bottom == undefined ? b.top + b.height : b.bottom;
            b.right = b.right == undefined ? b.left + b.width : b.right;
            a.bottom = a.bottom == undefined ? a.top + a.height : a.bottom;
            a.right = a.right == undefined ? a.left + a.width : a.right;

            return (
            a.top <= b.top && b.top <= a.bottom && ( a.left <= b.left && b.left <= a.right || a.left <= b.right && b.right <= a.right ) ||
            a.top <= b.bottom && b.bottom <= a.bottom && ( a.left <= b.left && b.left <= a.right || a.left <= b.right && b.right <= a.right ) ||
            a.left >= b.left && a.right <= b.right && ( b.top <= a.bottom && a.bottom <= b.bottom ||  b.bottom >= a.top && a.top >= b.top || a.top <= b.top && a.bottom >= b.bottom) ||
            a.top >= b.top && a.bottom <= b.bottom && ( b.left <= a.right && a.right <= b.right || b.right >= a.left && a.left >= b.left || a.left <= b.left && a.right >= b.right) ||
            a.top >= b.top && a.right <= b.right && a.bottom <= b.bottom && a.left >= b.left
            );
        };

    }

    function LikeRectCtrl($element){
        this.$element = $element;
    }

    LikeRectCtrl.prototype = {
        getClient: function(){
            return this.$element.dndClientRect();
        }
    };

    return {
        restrict: 'A',
        require: ['dndSelectable', '^dndLassoArea', '?dndRect'],
        controller: Controller,
        scope: true,
        link: function(scope, $el, attrs, ctrls) {
            scope.$dndSelectable = ctrls[0];

            var rectCtrl = ctrls[2];

            ctrls[0].rectCtrl = rectCtrl ? rectCtrl : new LikeRectCtrl($el);

            ctrls[1].add(ctrls[0]);

            function ondestroy() {
                ctrls[1].remove(ctrls[0]);

                if(!scope.$$phase) scope.$apply();
            }

            $el.on('$destroy', ondestroy);
        }
    };
}]);
