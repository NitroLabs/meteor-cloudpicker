Package.describe({
  name: 'nitrolabs:cloudpicker',
  version: '0.1.0',
  summary: 'Open files from any major cloud service',
  git: 'https://github.com/NitroLabs/meteor-cloudpicker',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.2.1');
  api.use(['templating']);
  api.use(['accounts-password','accounts-google']);
  api.use(['gcampax:accounts-dropbox']);
  api.addFiles('picker.js');
  api.addFiles('services/google.js');
  api.addFiles('services/dropbox.js');
  api.addFiles('services/onedrive.js');
  api.addFiles('services/box.js');
  api.addFiles('templates/templates.html','client');
  api.addFiles('templates/templates.js','client');
  api.export('CloudPicker');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('nitrolabs:cloudpicker');
  api.addFiles('picker-tests.js');
});
