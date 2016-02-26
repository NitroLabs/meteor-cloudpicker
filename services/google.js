function GooglePicker() {
    var self = this;
    self._options = {
        scope: [],
        views: ['all']
    };
}

GooglePicker.prototype.authenticate = function(callback) {
    // Launch the Meteor authentication flow
    // The meteor flow over the gapi flow, as it stores the users details
    var scope = Meteor.settings.public.google.picker.scope;
    var options = {
        requestPermissions: scope
    };
    Meteor.loginWithGoogle(options, callback);
};

GooglePicker.prototype.getMetadata = function(fileid, callback){
    // Load file metadata from the server
    // Return a standardized file object
    var self = this;
    $.getScript("https://apis.google.com/js/api.js", function() {
        gapi.load('picker', {
            'callback': function(){
                var file = {id: fileid};
                self._transform(file, callback);
            }
        });
    });
};

GooglePicker.prototype.pick = function(options, callback) {
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
        $.getScript("https://apis.google.com/js/api.js", function() {
            gapi.load('picker', {
                'callback': createPicker
            });
        });
    }

    function createPicker() {
        // Sanity check. We really need a valid access token
        var user = Meteor.user();
        var now = +new Date();
        var token = user.services.google.accessToken;
        var service = ServiceConfiguration.configurations.findOne({
            service: 'google'
        });
        if (!token) {
            throw new Error("There was no access token");
        } else if (user.services.google.expiresAt < now) {
            throw new Error("The token has expired");
        } else if (!service) {
            throw new Error("Could not find the google service configuration")
        } else if (!service.apiKey) {
            throw new Error("Please add you (developer) apiKey to the Google service configuration");
        } else {
            var picker = new google.picker.PickerBuilder().
            setOAuthToken(token).
            setDeveloperKey(service.apiKey).
            setCallback(pickerCallback).
            setOrigin(window.location.protocol + '//' + window.location.host);
            // Set the views specified in the options
            _.each(self._options.views, function(viewname) {
                picker.addView(self._getView(viewname));
            });
            picker.build().setVisible(true);
        }
    }

    function pickerCallback(data) {
        if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
            console.log("File selected using Google service", data);
            var doc = data[google.picker.Response.DOCUMENTS][0];
            self._transform(doc, callback);
        }
    }


    // Start the picker flow
    var user = Meteor.user();
    var now = +new Date();
    if (!user) {
        console.log("User was not logged");
        self.authenticate(handleLogin);
    } else if (!user.services || !user.services.google) {
        console.log("This user does not have a google accessToken");
        self.authenticate(handleLogin);
    } else if (user.services.google.expiresAt < now) {
        console.log("The accessToken has expired");
        self.authenticate(handleLogin)
    } else {
        // Use the API Loader script to load google.picker and gapi.auth.
        loadApi();
    }
};

GooglePicker.prototype._transform = function(file, callback) {
    // Transform the Google response to a standard format
    // Google does not provide the downloadUrl, so we have to request it separately

    function getMetadata(callback) {
        var user = Meteor.user();
        gapi.auth.setToken({
            access_token: user.services.google.accessToken,
            expires_in: user.services.google.expiresAt
        });
        gapi.client.request({
            'path': '/drive/v2/files/' + file.id,
            'params': {
                'maxResults': '10'
            },
            'callback': function(responsejs, responsetxt) {
                var url;
                if (responsejs.error) {
                    callback(responsejs.error);
                } else if (responsejs.downloadUrl) {
                    responsejs.url = responsejs.downloadUrl;
                    callback(null, responsejs);
                } else if (responsejs.exportLinks && responsejs.exportLinks['application/pdf']) {
                    responsejs.url = responsejs.exportLinks['application/pdf'];
                    callback(null, responsejs);
                } else {
                    callback("No download url");
                }
            }
        });
    }

    function transformFile(metadata, callback) {
        var token = Meteor.user().services.google.accessToken;
        var url = CloudPicker.updateQueryString(metadata.url, 'access_token', token);
        var newfile = {
            id: file.id,
            url: url,
            name: metadata.title || file.name,
            mimetype: metadata.mimeType || file.mimeType,
            size: metadata.fileSize || file.sizeBytes,
            icon: metadata.iconLink || file.iconUrl,
            thumbnail: null
        };

        callback(null, newfile);
    }


    function handleClientLoad() {
        getMetadata(function(error,metadata){
            if (error) return callback(error);
            transformFile(metadata, callback);
        });
    }

    // Load the client api, and start the flow.
    gapi.load('client', {
        callback: handleClientLoad
    });

};

GooglePicker.prototype._getView = function(viewname) {
    // Return a list of Google views
    // Assumes that `google` has already been defined as a global variable
    // ie the google api has been loaded
    var views = {
        'all': google.picker.ViewId.DOCS, //All Google Drive items.
        'photos': google.picker.ViewId.DOCS_IMAGES, //Google Drive photos.
        'documents': google.picker.ViewId.DOCUMENTS, //Google Drive Documents.
        'presentations': google.picker.ViewId.PRESENTATIONS, //Google Drive Presentations.
        'spreedsheets': google.picker.ViewId.SPREADSHEETS, //Google Drive Spreadsheet.
        'forms': google.picker.ViewId.FORMS, //Google Drive Forms.
        'photo+videos': google.picker.ViewId.DOCS_IMAGES_AND_VIDEOS, // Google Drive photos and videos.
        'videos': google.picker.ViewId.DOCS_VIDEOS, // Google Drive videos.
        'folders': google.picker.ViewId.Folders, //Google Drive Folders.
        'pdfs': google.picker.ViewId.PDFS //Adobe PDF files stored in Google Drive.
    };
    if (views[viewname]) {
        return views[viewname];
    } else {
        throw new Error("No such view: " + viewname);
    }
};

// Register this picker with the global Picker object
CloudPicker.register("Google", GooglePicker);