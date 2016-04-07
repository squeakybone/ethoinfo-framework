require('./index.less');

var $ = require('jquery'),
	velocity = require('velocity-animate'),
	Hammer = require('hammerjs'),
	_ = require('lodash'),
	EditExistingForm = require('edit-existing-form'),
	tmpl = require('./index.vash'),
	inlineChildTmpl = require('./inline-child.vash'),
	PopupButtons = require('popup-buttons'),
	scrollTmpl = require('./scroll.vash'),
	Scroll = require('iscroll');

var CreateSelectMenu = require('../../../create-select-dialog');

var EventEmitter = require('events').EventEmitter;
var util = require('util');


function _createChildCollectionData(parentDomain, childDomains){
	var lookup = _.chain(childDomains)
		.map(function(d){
			// sorry, cheap hack todo: hide this somewhere
			var parentPropertyName = d.getService('parent-'+parentDomain.name);

			return {
				collectionName: parentPropertyName,
				domain: d,
			};
		})
		.groupBy(function(d){return d.collectionName;})
		.value();

	return _.keys(lookup)
		.map(function(collectionName){
			return {
				collectionName: collectionName,
				domainNames:_.map(lookup[collectionName], function(d){return d.domain.name;}).join(','),
			};
		});
}

function EditTab(opts){
	console.log('Edittab');
	console.log(opts);
	EventEmitter.call(this);

	var self = this, editForm;
	var _context; 
	self.label = 'Data';
	self.$element = $(scrollTmpl({}));
	var	rootEntity = opts.rootEntity || opts.entity;


	self.setContext = function(ctx){
		_context = ctx;
		
		console.log('EditTab _context');
		console.log(_context);
		
		editForm = new EditExistingForm({entity: ctx.entity});
		editForm.updateFields();

		var childDomains = ctx.domain.getChildren();

		var inlineChildDomains = childDomains.filter(function(d){return d.inline;});
		var inlineChildren = _createChildCollectionData(ctx.domain, inlineChildDomains);

		var standardChildDomains = childDomains.filter(function(d){return !d.inline;});
		var standardChildren = _createChildCollectionData(ctx.domain, standardChildDomains);

		standardChildren.forEach(function(item){
				item.entities = (ctx.entity[item.collectionName] || [])
					.map(function(child){
						return {
							_id: child._id || child.id,
							domainLabel: child.domainName,
							entityLabel: ctx.getShortDescription(child),
						};
					});
			});

		self.$element
			.find('.scroller')
			.empty()
			.append(tmpl({
				childData: inlineChildren,
				standardChildren: standardChildren,
				label: ctx.domain.label,
			}));
			
		self.$element
			.find('.iScrollVerticalScrollbar').remove();

		self.$element
			.find('.edit-form')
			.empty()
			.append(editForm.$element);

		self.$element
			.css('width', window.innerWidth)
			.css('height', window.innerHeight-(96+44));

		self.$element
			.find('.float-right')
			.css('float', 'right');


			
		// give the browser a chance to reflow the new elements
		setTimeout(function() {
			var scroll = new Scroll(self.$element[0], {
					mouseWheel: true,
					scrollbars: true,
					tap:true
				});
		
				console.log(scroll);				
		},100);

		function _doSave(){
			// var rootDomain = app.getDomain(rootEntity.domainName),
			// 	rootEntityManager = rootDomain.getService('entity-manager');
			//
			// 	console.log("DO SAVE");
			//
			// return rootEntityManager.save(rootEntity)
			// 	.then(function(info){
			// 		rootEntity._id = info.id;
			// 		rootEntity._rev = info.rev;
			//
			// 		return info;
			// 	});
		}
		function _collapseChildren(collectionName){
			var $accordians = self.$element.find('.js-collection-'+ collectionName);

			var $icons = $accordians.find('i.js-expand-icon');
			var $itemContainers = $accordians.find('.item-container');

			$itemContainers.find('.js-expand-toggle').data('collapsed', true);
			velocity($itemContainers.find('.js-fields'), 'slideUp', {duration: 300});
			$icons.removeClass('ion-arrow-down-b').addClass('ion-arrow-right-b');
		}

		function _addInlineChild(collectionName, domainName){

			_collapseChildren(collectionName);
			var domain = _.find(childDomains, function(d){return d.name == domainName;}),
				$containerLi = $('<li></li>')
				.addClass('item')
				.addClass('item-container')
				//.addClass('header')
				.append(inlineChildTmpl({domainLabel: domain.label || domain.name}));

			var childForm = new EditExistingForm({entity: {domainName: domain.name}});
			childForm.$element.addClass('js-fields');
			$containerLi.append(childForm.$element);
		
			var $ul = self.$element.find('.js-collection-'+ collectionName);
			$ul.closest('ul')
				.append($containerLi);

			var $header = $containerLi.find('.js-expand-toggle');

			var headerHammer = new Hammer($header[0]);
			headerHammer.on('press', function(ev){
				headerHammer.on('pressup', function(){
					setTimeout(function(){
						popupButtons.opened();
					}, 10);
				});

				var popupButtons = new PopupButtons({
					items: [{ value: 'remove', label: 'Remove', 'class': 'button-assertive'}],
				});

				popupButtons.on('click', function(key){
					if (key == 'remove')
						velocity($header.closest('.item-container'), 'fadeOut', {duration:400});

					popupButtons.remove();
				});

				popupButtons.show(ev.pointers[0], true);
			});

			headerHammer
				.on('tap', function(){
					var DURATION = 200;
					var $this = $header,
						$icon = $this.find('i'),
						$accordian = $this.closest('.accordian');

					var $allIcons = $accordian.find('i.js-expand-icon').not($icon);
					var $allItemContainers = $accordian
						.find('.item-container')
						.not($containerLi);

					$allItemContainers.find('.js-expand-toggle').data('collapsed', true);
					velocity($allItemContainers.find('.js-fields'), 'slideUp', {duration: DURATION});
					$allIcons.removeClass('ion-arrow-down-b').addClass('ion-arrow-right-b');

					var isCollapsed = $this.data('collapsed');
					if (isCollapsed) {
						velocity(childForm.$element, 'slideDown', {duration: DURATION});
						$icon.addClass('ion-arrow-down-b').removeClass('ion-arrow-right-b');
					} else {
						velocity(childForm.$element, 'slideUp', {duration: DURATION});
						$icon.removeClass('ion-arrow-down-b').addClass('ion-arrow-right-b');
					}

					$this.data('collapsed', !isCollapsed);
				});

			setTimeout(function(){
				
				var scroll = new Scroll(self.$element[0], {
						mouseWheel: true,
						scrollbars: true,
						tap:true
					});
				scroll.refresh();
			}, 100);
		}
		
		var $btnAddChild = self.$element.find('.js-child-add');

		console.log("$btnAddChild");
		console.log($btnAddChild);

		self.$element.find('.js-child-add').each(function( index ){
			
			$(this).on('click', function(ev){
				var $this = $(this),
					collectionName = $this.data('collection'),
					domainNames = $this.data('domains').split(','),
					domains = childDomains.filter(function(d){return _.contains(domainNames, d.name);});


				var popupButtons = new PopupButtons({
					items: domains.map(function(d){ return {value: d.name, label: d.label};}),
				});

				popupButtons.on('click', function(domainName){
//					_addInlineChild(collectionName, domainName);

////////////


	// var descMgr = domain.getService('description-manager');
	// var title = 'Add a child to ' + descMgr.getShortDescription(entity);


	var m = new CreateSelectMenu({
		title: domainName,
		domains: domains.filter(function(d){return !d.inline;}),
		//crumbs: _.chain(crumbs).clone().push({label: 'Add child'}).value(),
	});

	m.on('created', function(child){
		var childDomain = app.getDomain(child.domainName),
			entityManager = childDomain.getService('entity-manager');

			console.log('created child');
			console.log(_context.entity);
			console.log(child);
		entityManager.addToParent(_context.entity, child);



	// var rootDomain = app.getDomain(_context.entity.domainName),
	// 	rootEntityManager = rootDomain.getService('entity-manager');
	//
	// rootEntityManager.save(child)
	// 	.then(function(info){
	// 		child._id = info.id;
	// 		child._rev = info.rev;
	//
	// 		return info;
	// 	});
	
	


		// _doSave().then(function(info){
// 				console.log("info.id");
// 				console.log(info.id);
// 				child._id = info.id;
// 				child._rev = info.rev;
//
// 			//_changeEntity(child);
// 			//_updateAddButton();
// 			//breadcrumb.add({context:child, label: _getLabel(child), color: _getColor(child)});
// 		})
// 		.catch(function(err){
// 			console.error(err);
// 		});

});
	m.show(ev);















//////////////
					popupButtons.remove();
				});

				popupButtons.show(ev);
			});
			// $(this).focusout(function(){
			// 	console.log('focusout');
			// });
		});

		self.$element.find('.js-inline-add')
			.on('click', function(ev){
				var $this = $(this),
					collectionName = $this.data('collection'),
					domainNames = $this.data('domains').split(','),
					domains = childDomains.filter(function(d){return _.contains(domainNames, d.name);});


				var popupButtons = new PopupButtons({
					items: domains.map(function(d){ return {value: d.name, label: d.label};}),
				});

				popupButtons.on('click', function(domainName){
					_addInlineChild(collectionName, domainName);
					popupButtons.remove();
				});

				popupButtons.show(ev);
			});

	};

	self.$element.on('tap', '.js-child-link', function(){
		var $this = $(this),
			collectionName = $this.data('collection'),
			_id = $this.data('id');

		var child = _.find(_context.entity[collectionName], function(c){
			return (c._id || c.id) == _id;
		});
		_context.descend(child);
	});

	self.loseFocus = function(){
		console.log("loseFocus");
		editForm.updateFields();
		
	var rootDomain = app.getDomain(rootEntity.domainName),
		rootEntityManager = rootDomain.getService('entity-manager');

		console.log("DO SAVE");
		console.log(rootEntityManager);
	rootEntityManager.save(_context.entity)
		.then(function(info){
			_context._id = info.id;
			_context._rev = info.rev;

			return info;
		});
//rootEntity		//
		// _doSave().then(function(){
		// 		_update(true);
		// 	}).catch(function(err){
		// 		console.error(err);
		// 	});
	};

}

util.inherits(EditTab, EventEmitter);
module.exports = EditTab;
