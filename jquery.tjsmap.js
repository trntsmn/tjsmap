
(function($) {
	// The following may be overwritten durning plugin init
	// by passing an options object to tjsmap
	var defaults = {
		center: new google.maps.LatLng(43.076161,-89.374294),
	    mapTypeId: google.maps.MapTypeId.ROADMAP,
		zoom: 15,
		draggable: true,
		navigationControl: true,
		scaleControl: true,
		rotateControl: false, 
		panControl: false,
		autoPan: true,
		zoomControl: true,
		mapTypeControl: true,
		scrollwheel: true,
		max_points: 1,
		points: null,
		cp: false,
		icon: null,
		shadow: null
	};
	
	// Private methods are for internal use only. They are not supported. Don't touch them.
	var privates = {
		// Return new lat/long google maps object
		latlng: function (latitude, longitude) {
			return new google.maps.LatLng(latitude, longitude)
		},
		geocode_address: function (address, callback) {
			var data = $(this).data('tjsmap');
			// Below we proxy the callback function to be sure that it's called within the scope of
			// this module, otherwise we won't have access to our data object in our callback
			data.geocoder.geocode({
				"address": address,
				"partialmatch": true
			}, $.proxy(callback, this))
		},
		add_geocode_to_map: function(geocode, status) {
			if (status == "OK" && geocode.length > 0) {
				var $this =  $(this);
				var data = $this.data('tjsmap');
				if(data.autoPan) {
					privates.fit_map.call(this, geocode[0].geometry.location);
				}
				id = Math.floor(Math.random() * 1000 + 1);
				marker = new google.maps.Marker({
					position: geocode[0].geometry.location,
					map: data.gmap,
					id: id,
					icon: data.icon,
					shadow: data.shadow});
				data.markers[id] = marker;
				data.marker = marker;
				$this.data('tjsmap', data);
				return true;
			} else {
				alert("Geocode was not successful for the following reason: " + status)
			}
		},
		add_latlng_to_map: function(latlng, options) {
			var $this =  $(this);
			var data = $this.data('tjsmap');
			
			if(data.autoPan) {
				privates.fit_map.call(this, latlng);
			}
			id = Math.floor(Math.random() * 1000 + 1);
			marker = new google.maps.Marker({
				position: latlng,
				map: data.gmap,
				id: id,
				icon: data.icon,
				shadow: data.shadow,
				zIndex: options.zIndex,
				animation: options.animation});
			data.markers[id] = marker;
			data.marker = marker;
			
			$this.data('tjsmap', data);
			return true;
		},
		fit_map: function (latlng) {
			var $this =  $(this);
			var data = $this.data('tjsmap');
			var bounds = data.gmap.getBounds();
			if(bounds) {
				var extended_bounds = bounds.extend(latlng)
				data.gmap.fitBounds(extended_bounds);
				data.gmap.panToBounds(extended_bounds);
			} else {
				// Since the map has not initialized yet we must work from a single point
				data.gmap.setCenter(latlng);
				data.gmap.panTo(latlng);
			}
			
		},
		rebound_current_bounds: function() {
			// Sometimes the map may initialize with bounds far exceeding the desired
			var bounds = new google.maps.LatLngBounds();
			var data = $(this).data('tjsmap');
			for (my_mark in data.markers) { // In javascript location is a reseverd word and should never be used.
				bounds = bounds.extend(data.markers[my_mark].getPosition())
			}
			data.gmap.fitBounds(bounds);
			data.gmap.panToBounds(bounds);
		},
		assume_point: function(options) {
			// This will follow our rules and attempt to
			// extract a point from our data
			var data = $(this).data('tjsmap');
			
			if(options.latlng != undefined && options.latlng instanceof google.maps.LatLng) {
				return options.latlng
			} else if(options.lat != undefined && options.lng != undefined) {
				return privates.latlng(options.lat, options.lng);
			} else if(data.marker != undefined) {
				// alert(data.marker.id + " at position " + data.marker.getPosition().toString() + ' marker content ' + options.content);
				return data.marker.getPosition();
			}
			return false;
		}
	};
	
	
	// This begins the public API
	var methods = {
		init : function( options ) { 
			// Parse our nice lat/lng values
			if(options != undefined ) {
				if(options.lat != undefined && options.lng != undefined) {
					options.center = privates.latlng(options.lat, options.lng)
				}
			}
			
			// Prevent users from passing an invalid icon
			if(options.icon != undefined) {
				if( icon_library.hasOwnProperty(options.icon) ) {
					if(eval('icon_library.' + options.icon) instanceof google.maps.MarkerImage) {
						// We requested a valid icon
						options.icon = eval('icon_library.' + options.icon); // Overwrite with one from our library
					} else {
						options.icon = null
					}
				} else if (options.icon instanceof google.maps.MarkerImage) {
					// We passed a valid icon
				} else { options.icon = null }
			}
			
			var opts = $.extend({}, defaults, options);
			
			return this.each(function () {
				var $this = $(this)
				var data = $this.data('tjsmap')
				// Define our initial vars
				if(!data) {
					$(this).data('tjsmap', {
						target : $this,
						gmap : new google.maps.Map(this, opts),
						geocoder : new google.maps.Geocoder(), // We'll need a geocoder
						directions: {},
						latlong: {},
						autoPan: opts.autoPan,
						findatposition: '', // This is latlng used when determining which section of the 
											// polygon the user has selected to drag
						shape_counter: 0,
						marker: {}, // Map markers are stored here
						markers: [], // Map markers are stored here
						poly: {}, // The polygon
						poly_points: {}, // Points of the polygon
						max_points: {},
						image_bounds: {},
						overlays: {},
						overlay: {},
						active_point: {},
						cp: false,
						field_id: $this.attr('id'),
						icon: opts.icon
					});
				}
				
				
				
				// methods.configuration.call( this, opts );
				
				// Bind event using the google global object
				google.maps.event.trigger(this, 'resize');
			})
		},
		marker: function(options) {
			return this.each(function(){
				var $this = $(this);
				var data = $this.data('tjsmap');
				if(options.latlng != undefined) {
					privates.add_latlng_to_map.call(this, options.latlng, options);
				}else if(options.address != undefined) {
					privates.geocode_address.call(this, options.address, privates.add_geocode_to_map);
				} else if(options.lat != undefined && options.lng != undefined) {
					var latlng = privates.latlng(options.lat, options.lng);
					privates.add_latlng_to_map.call(this, latlng, options);
				} else {
					$.error( 'You must pass a location to place the marker' );
				}
			})
		},
		geocode: function(options) {
			return this.each(function(){
				if(options.address != undefined && options.callback != undefined) {
					privates.geocode_address.call(this, options.address, options.callback);
				} else {
					$.error( 'Failed to add needed params' );
				}
			})
		},
		icon: function(options) {
			// Prevent users from passing an invalid icon
			if(options.icon != undefined) {
				if( icon_library.hasOwnProperty(options.icon) ) {
					if(eval('icon_library.' + options.icon) instanceof google.maps.MarkerImage) {
						// We requested a valid icon
						options.icon = eval('icon_library.' + options.icon); // Overwrite with one from our library
					} else {
						options.icon = null
					}
				} else if (options.icon instanceof google.maps.MarkerImage) {
					// We passed a valid icon
				} else { options.icon = null }
			}
			
			// Prevent users from passing an invalid icon
			if(options.shadow != undefined) {
				if( icon_library.hasOwnProperty(options.shadow) ) {
					if(eval('icon_library.' + options.shadow) instanceof google.maps.MarkerImage) {
						// We requested a valid icon
						options.shadow = eval('icon_library.' + options.shadow); // Overwrite with one from our library
					} else {
						options.shadow = null
					}
				} else if (options.shadow instanceof google.maps.MarkerImage) {
					// We passed a valid icon
				} else { options.shadow = null }
			}
			
			return this.each(function () {
				var $this = $(this);
				var data = $this.data('tjsmap');
				data.icon = options.icon;
				data.shadow = options.shadow;
				$this.data('tjsmap', data);
			})
		},
		rebound: function() {
			return this.each(function(){
				privates.rebound_current_bounds.call(this);
			})
		},
		overlay: function(options) {
			if(!options) options = {}
			var $this = $(this);
			var data = $this.data('tjsmap');
			
			if(options.id == undefined) {
				options.id = Math.floor(Math.random() * 1000 + 1);
			}
			
			if(options.content_selector != undefined) {
				options.content = $(options.content_selector).html()
				$(options.content_selector).remove();
			}
			
			if( options.rich_overlay ) {
				overlay = new RichOverlay(options);
				// The following if block controls when the overlay is made visible on the map
				if(options.marker instanceof google.maps.Marker ) {
					// Bind the overlay to the marker passed
					overlay.bindMarker(options.marker);
					google.maps.event.addListener(options.marker, 'click', function() {
						// Using closures to bind the open event @see http://jibbering.com/faq/notes/closures/
						overlay.setMap(data.gmap);
					});
					if(options.open_onload == true) overlay.setMap(data.gmap);
				} else if(data.marker != undefined && data.marker instanceof google.maps.Marker ) {
					// Bind the overlay automatically to the last marker added.
					overlay.bindMarker(data.marker);
					google.maps.event.addListener(data.marker, 'click', function() {
						// Using closures to bind the open event @see http://jibbering.com/faq/notes/closures/
						overlay.setMap(data.gmap);
					});
					if(options.open_onload == true) overlay.setMap(data.gmap);
				} else {
					// Without a marker to bind the overlay to we'll open it ASAP
					overlay.setMap(data.gmap);
				}
				
				data.overlays[overlay.getSelf()] = overlay;
			} else {
				var pos = privates.assume_point.call(this, options);
				var sv_image = 'http://maps.googleapis.com/maps/api/streetview?size=150x100&location=' + pos.toString() + '&sensor=false'
				options.content += '<img src="' + sv_image + '" alt="Streetview Image" class="right" />'
				data.overlays[options.id] = new google.maps.InfoWindow({
					content: options.content,
					maxWidth: 500,
					position: pos
				})
				if(options.marker instanceof google.maps.Marker ) {
					// Bind the overlay to the marker passed
					google.maps.event.addListener(options.marker, 'click', function() {
						// Using closures to bind the open event @see http://jibbering.com/faq/notes/closures/
						data.overlays[options.id].open(data.gmap, options.marker);
					});
					if(options.open_onload == true) data.overlays[options.id].open(data.gmap, options.marker);
				} else if(data.marker instanceof google.maps.Marker ) {
					// Bind the overlay automatically to the last marker added.
					var id_to_bind = data.marker.id
					google.maps.event.addListener(data.markers[id_to_bind], 'click', function() {
						// Using closures to bind the open event @see http://jibbering.com/faq/notes/closures/
						data.overlays[options.id].open(data.gmap, data.markers[id_to_bind]);
					});
					if(options.open_onload == true) data.overlays[options.id].open(data.gmap, data.markers[id_to_bind]);
				} else {
					// Without a marker to bind the overlay to we'll open it ASAP
					data.overlays[options.id].open(data.gmap);
				}
				
			} // EOF regular overlay
			
			return this.each(function(){
				$this.data('tjsmap', data); // Save the new data for later
			})
		},
		show : function( ) {
			
			return this.each(function(){
				var $this = $(this);
				var data = $this.data('tjsmap');
					
			})
		},
		configuration : function(options) {
			//// Use configuration to set plugin defaults, prior to placing icons and overlays
		},
		hide : function( ) { 
		  
		},
		update : function( content ) { 
		  
		},
		
		markers: function (markers) {
			// loop through our markers and add them to the map
		},
		clear : function (options) {
			var $this = $(this);
			var data = $this.data('tjsmap');
			// Clear map markers
			// $.each(data.markers, function(index, value) { 
			// 				value.setMap(null);
			// 			});
			
		}
	};
	
	var icon_library = {
		icon_poly: new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_simple_text_icon_left&chld=|12|00F|glyphish_location|12|F55|", null, null, new google.maps.Point(6, 6), new google.maps.Size(18, 12)),
		icon_planet: new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_simple_text_icon_left&chld=|12|00F|glyphish_planet|16|333|", null, null, new google.maps.Point(8, 8)),
		icon_wine: new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_simple_text_icon_left&chld=|12|00F|glyphish_wineglass|16|907|", null, null, new google.maps.Point(8, 8)),
		icon_zap: new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_simple_text_icon_left&chld=|12|00F|glyphish_zap|16|000|", null, null, new google.maps.Point(8, 8)),
		icon_poly_over: new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_simple_text_icon_left&chld=|12|00F|glyphish_location|12|F00|FFF", null, null, new google.maps.Point(6, 6), new google.maps.Size(18, 12))
	};
	
	// This custom google overlay object should not be called directly, instead use the overlay method
	function RichOverlay(options) {
		if(!options) {
			$.error( 'Tried to add RichOverlay with missing options' );
		}
		
		// The following must be defined during the init phase to be compat with the persistance layer
		this.id = options.id != undefined ? options.id : Math.floor(Math.random() * 1000 + 1);
		this.content = options.content != undefined ? options.content : '';
		this.close_element = options.close_element != undefined ? options.close_element : '.close';
		// You must pass a width and height since we won't be able to position our element without these
		this.width = options.width != undefined ? options.width : 300;
		this.height = options.height != undefined ? options.height : 200;
		
		google.maps.OverlayView.call(this);
		
	}
	RichOverlay.prototype = new google.maps.OverlayView();
	RichOverlay.prototype.onAdd = function() {
		this.panes = this.getPanes();
		if( !this.div ) {
			this.div = document.createElement("div");
			this.div.innerHTML = this.content;
			this.div.style.position = "absolute";
			this.div.setAttribute('id',this.id);
			this.panes.floatPane.appendChild(this.div);
			// Using jquery here to unify our selector language
			$("#" + this.id).find(this.close_element).bind('click', $.proxy(this.hide, this));
		} else {
			this.div.style.visibility = "visible";
		}
	};
	RichOverlay.prototype.getSelf = function() {
		if(this.id) {
			return this.id;
		} else {
			return false;
		}
	};
	RichOverlay.prototype.bindMarker = function(marker) {
		this.marker = marker;
	}
	RichOverlay.prototype.draw = function() {
		// Size and position the overlay. We use a southwest and northeast
		// position of the overlay to peg it to the correct position and size.
		// We need to retrieve the projection from this overlay to do this.
		var overlayProjection = this.getProjection();
		
		if(this.marker != undefined) {
			
			var pt = overlayProjection.fromLatLngToDivPixel(this.marker.getPosition());
			this.div.style.top = (pt.y - this.height) + 'px';
			this.div.style.left = (pt.x - (.5*this.width)) + 'px';
			this.div.style.width = this.width + 'px';
			this.div.style.height = this.height + 'px';
		} else {
			// Without attaching a valid marker the position is (0,0)
			this.div.style.width = this.width + 'px';
			this.div.style.height = this.height + 'px';
			return;
		}
	};
	RichOverlay.prototype.hide = function() {
		this.div.style.visibility = "hidden";
		var event = jQuery.Event("dispatch-richoverlay-close");
		event.field_id = this.id;
		event.marker = this.marker.id;
		$("body").trigger(event);
		return false;
	};
	RichOverlay.prototype.onRemove = function() {
		this.div.parentNode.removeChild(this.div);
		this.div = null;
	}
	$.fn.tjsmap = function(option) {
		if ( methods[option] ) {
			return methods[ option ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof option === 'object' || ! option ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  option + ' does not exist on jQuery.tjsmap' );
	    }
	};
}) (jQuery);