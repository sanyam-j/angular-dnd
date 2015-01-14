module.directive('dndDraggable', ['$timeout', '$parse', '$http', '$compile', '$q', '$templateCache', 'EventEmitter',
function($timeout, $parse, $http, $compile, $q, $templateCache, EventEmitter) {

	var ElementTarget = (function(){

		function ElementTarget(element, rect){

			var cssPosition =  element.dndCss('position');

			if(cssPosition != 'fixed' && cssPosition != 'absolute' && cssPosition != 'relative') {
				cssPosition = 'relative';
				element.dndCss('position', cssPosition);
			}

			this.element = element;

			this.rect = rect;
		}

		ElementTarget.prototype = {
			getCorrectedOffset: function(axis){
				var offset = {}, crect = this.element.dndClientRect();

				offset.top = axis.y - crect.top;
				offset.left = axis.x - crect.left;
				offset.bottom = offset.top - crect.height;
				offset.right = offset.left - crect.width;

				return offset;
			},

			init: function(){
				delete this.start;
			},

			updatePosition: function( axis ){
				if(!this.start) {
					this.start = Point(this.element.dndStyleRect()).minus(axis);
				};

				var position = Point(this.start).plus(axis);

				this.rect ? this.rect.update( position.getAsCss() ) : this.element.dndCss( position.getAsCss() );
			},

			destroy: function(){

			},

		};

		return ElementTarget;
	})();

	var HelperTarget = (function(){

		var wrapper = $('<div class = "angular-dnd-helper"></div>').dndCss({position: 'absolute'});

		function HelperTarget(mainElement, templateUrl, scope){
			var self = this;

			this.mainElement = mainElement;
			this.scope = scope;
			this._inited = false;
			this.templateUrl = templateUrl;

			function createTemplateByUrl(templateUrl){
				templateUrl = angular.isFunction(templateUrl) ? templateUrl() : templateUrl;

				return $http.get(templateUrl, {cache: $templateCache}).then(function(result) {
					self.template = result.data;
				});
			}

			if (templateUrl !== 'clone')  {
				createTemplateByUrl(templateUrl);
			}
		};

		HelperTarget.prototype = {

			init: function(){
				delete this.start;
				delete this.element;

				if(this.templateUrl === 'clone') this.createElementByClone().wrap().appendTo( this.mainElement.parent());
				else this.compile(this.scope).wrap().appendTo( this.mainElement.parent());

				this.scope.$apply();

				return this;
			},

			createElementByClone: function(){
				this.element = this.mainElement.clone();
				this.element.dndCss('position', 'static');

				return this;
			},

			compile: function(){
				this.element = $compile(this.template)(this.scope);

				return this;
			},

			wrap: function(){
				wrapper.html('');
				wrapper.append(this.element);

				return this;
			},

			appendTo: function(element){
				element.append(wrapper);

				return this;
			},

			getCorrectedOffset: function(){
				var offset = {}, crect = wrapper.dndClientRect();

				offset.top = crect.height;
				offset.left = crect.width;
				offset.bottom = 0;
				offset.right = 0;

				return offset;
			},

			updatePosition: function(axis){
				wrapper.dndCss( axis.getAsCss() );
			},

			destroy: function(){
				this.element.remove();
			},
		};

		return HelperTarget;
	})();


	return {
		require: ['?dndRect', '?dndModel', '?^dndContainer'],
		scope: true,
		link: function(scope, element, attrs, ctrls){
			var rect = ctrls[0], model = ctrls[1], container = ctrls[2];

			var defaults = {
				layer: 'common',
				useAsPoint: false,
				helper: null,
				restrictMovement: true
			};

			var getterDraggable = $parse(attrs.dndDraggable);
			var opts = extend({}, defaults, $parse(attrs.dndDraggableOpts)(scope) || {});
			var dragstartCallback = $parse(attrs.dndOnDragstart);
			var dragCallback = $parse(attrs.dndOnDrag);
			var dragendCallback = $parse(attrs.dndOnDragend);
			var started;
			var draggable = opts.helper ? new HelperTarget(element, opts.helper, scope) : new ElementTarget(element, rect);

			function dragstart(api){
				started = false;

				// определяем включен ли draggable элемент
				var enabled = getterDraggable(scope);
				enabled = enabled === undefined ? true : enabled;

				// если draggable элемент выключен - отмечаем элемент как "не цель курсора"
				if( !enabled ) api.unTarget();

				// если элемент не является целью курсора - никак не реагируем на событие
				if( !api.isTarget() ) return;

				draggable.init();

				// ставим флаг, что элемент начал двигаться
				started = true;

				// ставим флаг useAsPoint, что бы определить, является ли элемент полноразмерным или точкой.
				// В зависимости от этого флага по разному реагируют droppable зоны на этот элемент
				api.useAsPoint(opts.useAsPoint);

				// задаем модель данному элементу
				api.dragmodel = model ? model.get() : null;

				if(opts.restrictMovement) {
					var $bounder = container ? container.getElement() : angular.element(document.body);

					api.setBounderElement( $bounder );
				}

				// ставим флаг, что процесс перемещения элемента начался
				scope.$dragged = true;

				// задаем смещение для коррекции подсчета позиции курсора при движении элемента
				api.setAxisOffset(draggable.getCorrectedOffset(api.getAxis()));

				// применяем пользовательский callback
				dragstartCallback(scope, {'$dragmodel':api.dragmodel, '$dropmodel': api.dropmodel, '$api': api});

				// запускаем dirty-checking цикл
				scope.$apply();
			}

			function drag(api){
				if(!started) return;

				draggable.updatePosition( api.getRelativeAxis() );
				dragCallback(scope, {'$dragmodel':api.dragmodel, '$dropmodel': api.dropmodel, '$api': api});

				scope.$apply();
			}

			function dragend(api){
				if(!started) return;

				draggable.destroy();

				dragendCallback(scope, {'$dragmodel':api.dragmodel, '$dropmodel': api.dropmodel, '$api': api});

				$timeout(function(){
					scope.$dragged = false;
				});
			}

			var bindings = {};

			opts.layer = opts.layer || defaults.layer;

			bindings[opts.layer+'.dragstart'] = dragstart;
			bindings[opts.layer+'.drag'] = drag;
			bindings[opts.layer+'.dragend'] = dragend;

			element.dndBind( bindings );

			scope.$dragged = false;

		}
	};
}])