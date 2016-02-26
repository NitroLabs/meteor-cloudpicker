function OnedrivePicker(){
  var self = this;
  //self._options = {
  //  scope:[],
  //  views:['documents','pdfs','photos']
  //};
}

OnedrivePicker.prototype.authenticate = function(callback){
  //var scope = ['https://www.onedriveapis.com/auth/drive.readonly']
  //var options = {requestPermissions: scope};
  var options = {};
  Meteor.loginWithOnedrive(options, callback);
};

OnedrivePicker.prototype.pick = function(options, callback, user){
  // Launch the defaul picker
  // @options is an entirely optional parameter used to customize the picker
  // @options.view: The views to be included in the picker
  var self = this;

  // Set the default options
  self._options = _.extend(self._options, options);


  function handleLogin(error){
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

  function loadApi(){
    $.getScript("//js.live.net/v5.0/wl.js",createPicker);
  }

  function createPicker(){
    // Sanity check. We really need a valid access token
    var user = Meteor.user();
    var now = +new Date();
    var token = user.services.onedrive.accessToken;
    var service = ServiceConfiguration.configurations.findOne({service:'onedrive'});
      var client_id = service.clientId;
    if (!token){
      throw new Error("There was no access token");
    } else if (user.services.onedrive.expiresAt*1000 < now){
        throw new Error("The token has expired");
    } else if (!service){
        throw new Error("Could not find the onedrive service configuration")
    //} else if (!service.apiKey){
    //    throw new Error("Please add you (developer) apiKey to the Onedrive service configuration");
    } else {
      WL.init({
          client_id: client_id
          //,redirect_uri: redirect_uri
      });

      WL.login({ "scope": "wl.skydrive wl.signin" }).then(openFromSkyDrive,
        function(response) {
          console.error("Onedrive: Failed to authenticate.");
          console.error(response);
        }
      );
      function openFromSkyDrive(response) {
        console.log(response);
        WL.fileDialog({
          mode: 'open',
          select: 'single'
        }).then(
          function(response) {
            console.info("OneDrive: The following file is being downloaded:");
            try {
              var data = response.data.files[0];
              console.log("File selected using Onedrive service",data);
              var url = CloudPicker.updateQueryString(data.upload_location, 'access_token', token);
              var file = {
                id: data.id.split('.')[2],
                name: data.name,
                url: url
              };
              return callback(null,file);
            } catch (e)
            {
              console.error(e);
            }
          },
          function(errorResponse) {
            console.error("WL.fileDialog errorResponse = " + JSON.stringify(errorResponse));
          }
        );
      }
    }
  }

  // Start the picker flow
  var now = +new Date();
  if (!user){
    console.log("User was not logged");
    self.authenticate(handleLogin);
  } else if (!user.services || !user.services.onedrive){
    console.log("This user does not have a onedrive accessToken");
    self.authenticate(handleLogin);
  } else if (user.services.onedrive.expiresAt*1000<now) {
    console.log("The accessToken has expired");
    self.authenticate(handleLogin)
  } else {
    // Use the API Loader script to load onedrive.picker and gapi.auth.
    loadApi();
  }
};

// Register this picker with the global Picker object
CloudPicker.register("Onedrive",OnedrivePicker);

