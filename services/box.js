
function BoxPicker() {
	var self = this;
	self._options = {
		scope: [],
		views: null,
		multiselect: false
	};
}



BoxPicker.prototype.authenticate = function(callback) {
	if (!Meteor.loginWithBox) {
		console.error("Add accounts-box to enable authentication");
		callback("Add accounts-box to enable authentication");
	} else {
		var options = {};
		Meteor.loginWithBox(options, callback);
	}
};



BoxPicker.prototype.pick = function(options, callback) {
	// Launch the default picker
	// @options is an entirely optional parameter used to customize the picker
	// @options.view: The views to be included in the picker
	var self = this;

	// Set the default options
	self._options = _.extend(self._options, options);

	function handleLogin(error) {
		var ignoreErrorMessages = [
		  "Service correctly added to the current user, no need to proceed!",
		  "Another account registered with the same service was found, and melded with the current one!"
		];
		if (error && ignoreErrorMessages.indexOf(error.message) == -1 ) {
		  console.log("Login failed, aborting!");
		  console.error(error);
		  throw new Error(error);
		} else {
		  if (error) console.log(error.message);
		  loadApi();
		}
	}

	function loadApi() {
		// The dropbox api expects #dropboxjs to have a data-app-key attribute
		$.getScript("https://app.box.com/js/static/select.js", function() {
			createPicker();
		});
	}

	function createPicker() {
		// Launch the picker dialog
		var user = Meteor.user();
		var now = +new Date();
		var token = user.services.box.accessToken;
		var service = ServiceConfiguration.configurations.findOne({service:'box'});
		if (!token) {
			return callback("There was no access token");
		} else if (user.services.box.expiresAt < now) {
			return callback("The token has expired");
		} else if (!service) {
			return callback("Could not find the box service configuration")
		} else if (!service.clientId) {
			return callback("Please add your clientId to the Box service configuration")
		} else {
			var picker = new BoxSelect({
				clientId: service.clientId,
				linkType: "direct",
				multiselect: self._options.multiselect
			});
			picker.success(pickerSuccess);
			picker.cancel(pickerClose);
			picker.launchPopup();
		}
	}


	function pickerSuccess(files) {
		console.log("File selected using Box.com service", files);
		self._transform(files[0], callback);
	}

	function pickerClose(data) {
		console.log("Box picker closed")
	}


	// Start the picker flow
	var user = Meteor.user();
	var now = +new Date();
	if (!user) {
		console.log("User was not logged");
		self.authenticate(handleLogin);
	} else if (!user.services || !user.services.box) {
		console.log("This user does not have a Box accessToken");
		self.authenticate(handleLogin);
	} else if (user.services.box.expiresAt < now) {
		console.log("The accessToken has expired");
		self.authenticate(handleLogin)
	} else {
		// Use the API Loader script to load box.picker
		loadApi();
	}
};



BoxPicker.prototype._transform = function(file, callback) {
	// Return the transformed file
	var token = Meteor.user().services.box.accessToken;
	var url = Picker.updateQueryString(file.url,'access_token',token);
	var newfile = {
		id: file.id,
		url: url,
		size: file.size,
		name: file.name,
		icon: null,
		mimetype: null,
		thumbnail: null
	};
	callback(null, newfile);
};


BoxPicker.prototype.download = function() {};



// Register this picker with the global Picker object
CloudPicker.register("Box", BoxPicker);
