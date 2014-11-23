require('./index.less');

var $ = require('jquery'),
	_ = require('lodash'),
	q = require('q'),
	app = require('app'),
	createTimeline = require('d3-timeline'),
	ActivityFilter = require('activity-filter'),
	CreateNewDialog = require('../create-new-dialog'),
	FormDialog = require('form-dialog'),
	//sampleData = require('sample-data'),
	pageTemplate = require('./index.vash');


function TimelinePage(){
	var self = this,
		activityFilter = new ActivityFilter();

	activityFilter.on('predicate-change', function(){
		self.render();
	});

	debugger
	var timeline = createTimeline({
		getEventTimestamp: function(d){
			var domain = app.getDomain(d.domainName);
			var service = domain.getService('event');

			return service.getTimestamp(d);
		},
		getActivityBegin: function(d){
			var domain = app.getDomain(d.domainName);
			var service = domain.getService('activity');

			return service.getBeginTime(d);
		},
		getActivityEnd: function(d){
			var domain = app.getDomain(d.domainName);
			var service = domain.getService('activity');

			return service.getEndTime(d);
		},
		getLabel: function(d){
			var domain = app.getDomain(d.domainName);
			var service = domain.getService('description');

			return service ? service.getLabel(d) : 'no label';
		},
	});

	self.$element = $(pageTemplate({}));
	self.$element.find('#select-container').append(activityFilter.$element);
	self.$element.find('#timeline-container').append(timeline.element);

	self.render = function(){
		var isVisble = activityFilter.createPredicate();
		var fetchPromises = app.getDomains('activity')
			.concat(app.getDomains('event'))
			.map(function(domain){
				var entityManager = domain.getService('entity-manager');
				return entityManager.getAll();
			});

		q.all(fetchPromises)
			.then(function(results){
				var entities = _.flatten(results)
					.filter(isVisble);

				timeline.activities.add(entities);
			});
	};

	window.addEventListener('orientationchange', function(){
		self.render();
	});

	$('body').on('click','.js-btn-add', function(){
			var newActivityDialog = new CreateNewDialog();

			newActivityDialog.on('new', function(data){
				var entityManager = app.getService(data.domainName, 'entity-manager');

				entityManager.save(data)
					.then(function(){
						timeline.activities.add(data);
					})
					.catch(function(err){
						console.error(err);
						window.alert('could not save :/');
					});
			});

			newActivityDialog.show();
		});

	// longClick(self.$element, '.activity[data-id]', function(){
	// 	self.$element
	// 		.find('.actvity[data-id]')
	// 		.removeClass('selected');

	// 	$(this).addClass('selected');
	// 	alert('aha');
	// });
	timeline.on('activity-click', function(d){
		debugger
		var domain = app.getDomain(d.domainName);
		var m = new FormDialog(domain, d);

		m.show();
	});


	self.hide = self.$element.hide.bind(self.$element);
	self.show = function (){
		self.$element.show();
	};

	process.nextTick(function(){
		self.render();
	});
}

module.exports = TimelinePage;