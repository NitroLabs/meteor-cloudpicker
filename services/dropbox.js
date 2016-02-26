function DropboxPicker() {
    var self = this;
    self._options = {
        scope: [],
        views: ['documents', 'pdfs', 'photos'],
        multiselect: false,
        linkType: 'preview'
    }
}

DropboxPicker.prototype.authenticate = function(callback) {
    //var scope = ['https://www.googleapis.com/auth/drive.readonly']
    //var options = {requestPermissions: scope};
    Meteor.loginWithDropbox(callback);
};

DropboxPicker.prototype.pick = function(options, callback) {
    // Launch the defaul picker
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
        var service = ServiceConfiguration.configurations.findOne({
            service: 'dropbox'
        });
        if (!service) {
            throw new Error("Could not find the dropbox service configuration")
        } else if (!service.clientId) {
            throw new Error("Please add your clientId to the dropbox service configuration");
        } else if (!document.getElementById('dropboxjs')) {
            var context = {
                key: service.clientId
            };
            var template = Template._dropboxjs;
            Blaze.renderWithData(template, context, document.body);
        }
        $.getScript("https://www.dropbox.com/static/api/2/dropins.js", function() {
            createPicker();
        });
    }


    function createPicker() {
        // Sanity check. We really need a valid access token
        var user = Meteor.user();
        var now = +new Date();
        var token = user.services.dropbox.accessToken;
        var service = ServiceConfiguration.configurations.findOne({
            service: 'dropbox'
        });
        if (!token) {
            throw new Error("There was no access token");
        } else if (user.services.dropbox.expiresAt < now) {
            throw new Error("The token has expired");
        } else if (!service) {
            throw new Error("Could not find the google service configuration")
        } else if (!service.clientId) {
            throw new Error("Please add your clientId to the Dropbox service configuration");
        }

        var options = {
            // Required. Called when a user selects an item in the Chooser.
            success: pickerSuccess,
            cancel: pickerCancel,
            linkType: self._options.linkType,
            multiselect: self._options.multiselect,
            extensions: self._getViews(self._options.views)
        };
        Dropbox.choose(options);
    }


    function pickerSuccess(files) {
        console.log('File selected using Dropbox service ', files);
        var doc = files[0];
        var file = transformFile(doc);
        return callback(null, file);
    }

    function pickerCancel() {
        console.log('User closed the Dropbox dialog');
    }

    function transformFile(file) {
        // Transform the google response to the Picker.file
        var token = Meteor.user().services.dropbox.accessToken;
        var url = Picker.updateQueryString(file.link, "access_token", token);
        var customizedRemoteId = getDropboxCustomizedRemoteId(file.link);
        console.log(file);
        return {
            id: customizedRemoteId,
            url: url,
            size: file.bytes,
            name: file.name,
            icon: file.iconUrl,
            mimetype: null,
            thumbnail: file.thumbnailLink
        };
    }

    function getDropboxCustomizedRemoteId(url){
        var substringStart = url.lastIndexOf('/s/') + '/s/'.length;
        var substringEnd = url.lastIndexOf('/');
        return url.substring(substringStart, substringEnd);
    }

    // Start the picker flow
    var user = Meteor.user();
    var now = +new Date();
    if (!user) {
        console.log("User is not logged in");
        self.authenticate(handleLogin);
    } else if (!user.services || !user.services.dropbox) {
        console.log("This user does not have a dropbox accessToken");
        self.authenticate(handleLogin);
    } else if (user.services.dropbox.expiresAt < now) {
        console.log("The accessToken has expired");
        self.authenticate(handleLogin)
    } else {
        // Use the API Loader script to load google.picker and gapi.auth.
        loadApi();
    }
};


DropboxPicker.prototype.download = function() {}

DropboxPicker.prototype._getViews = function(viewnames) {
    // Return a list of Google views
    // Assumes that `google` has already been defined as a global variable
    // ie the google api has been loaded
    var viewmap = {
        'all': [],
        'photos': ['images'],
        'documents': ['documents'],
        'presentations': ['.pps', '.ppsm', '.ppsx', '.ppt', '.ppthtml', '.pptm', '.pptx'],
        'spreedsheets': ['.xls, .xlsb, .xlsm, .xlsx, .xltm, .xltx'],
        'photo+videos': ['images', 'vidoes'],
        'videos': ['videos'],
        'pdfs': ['.pdf']
    };
    var views = [];
    _.each(viewnames, function(viewname) {
        if (viewmap[viewname]) {
            views = _.union(views, viewmap[viewname]);
        } else {
            throw new Error("No such view: " + viewname);
        }
    });
    return views;
};

// Register this picker with the global Picker object
CloudPicker.register("Dropbox", DropboxPicker);
