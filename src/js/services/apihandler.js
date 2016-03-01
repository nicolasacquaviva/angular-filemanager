(function(angular, $) {
    'use strict';
    angular.module('FileManagerApp').service('apiHandler', ['$http', '$q', '$window', '$translate', 'fileManagerConfig', 
        function ($http, $q, $window, $translate, fileManagerConfig) {

        $http.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

        var ApiHandler = function() {
            this.inprocess = false;
            this.asyncSuccess = false;
            this.error = '';
        };

        ApiHandler.prototype.getFileList = function(files) {
            return (files || []).map(function(file) {
                return file && file.model.fullPath();
            });
        };

        ApiHandler.prototype.getFilePath = function(item) {
            return item && item.model.fullPath();
        };

        ApiHandler.prototype.deferredHandler = function(data, deferred, defaultMsg) {
            if (!data || typeof data !== 'object') {
                this.error = 'Bridge response error, please check the docs';
            }
            if (data.result && data.result.error) {
                this.error = data.result.error;
            }
            if (!this.error && data.error) {
                this.error = data.error.message;
            }
            if (!this.error && defaultMsg) {
                this.error = defaultMsg;
            }
            if (this.error) {
                return deferred.reject(data);
            }
            return deferred.resolve(data);
        };

        ApiHandler.prototype.list = function(path, customDeferredHandler) {
            var self = this;
            var dfHandler = customDeferredHandler || self.deferredHandler;
            var deferred = $q.defer();
            var data = {params: {
                mode: 'list',
                onlyFolders: false,
                path: '/' + path
            }};

            self.inprocess = true;
            self.error = '';

            $http.post(fileManagerConfig.listUrl, data).success(function(data) {
                dfHandler(data, deferred);
            }).error(function(data) {
                dfHandler(data, deferred, 'Unknown error listing, check the response');
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.copy = function(files, path) {
            var self = this;
            var deferred = $q.defer();
            var data = {params: {
                mode: 'copy',
                items: self.getFileList(files),
                newPath: '/' + path.join('/')
            }};

            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.copyUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('error_copying'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.move = function(files, path) {
            var self = this;
            var deferred = $q.defer();
            var data = {params: {
                mode: 'move',
                items: self.getFileList(files),
                newPath: '/' + path.join('/')
            }};
            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.renameUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('error_renaming'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.remove = function(files) {
            var self = this;
            var deferred = $q.defer();
            var data = {params: {
                mode: 'delete',
                items: self.getFileList(files)
            }};

            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.removeUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('error_deleting'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.upload = function(fileList, path) {
            if (! $window.FormData) {
                throw new Error('Unsupported browser version');
            }
            var self = this;
            var form = new $window.FormData();
            var deferred = $q.defer();
            form.append('destination', '/' + path.join('/'));

            for (var i = 0; i < fileList.length; i++) {
                var fileObj = fileList.item(i);
                fileObj instanceof $window.File && form.append('file-' + i, fileObj);
            }

            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.uploadUrl, form, {
                transformRequest: angular.identity,
                headers: {
                    'Content-Type': undefined
                }
            }).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, 'Unknown error uploading files');
            })['finally'](function() {
                self.inprocess = false;
            });

            return deferred.promise;
        };

        ApiHandler.prototype.getContent = function(item) {
            var path = this.getFilePath(item);
            var self = this;
            var deferred = $q.defer();
            var data = {params: {
                mode: 'editfile',
                path: path
            }};

            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.getContentUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('error_getting_content'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.edit = function(item, content) {
            var path = this.getFilePath(item);
            var self = this;
            var deferred = $q.defer();
            var data = {params: {
                mode: 'savefile',
                content: content,
                path: path
            }};

            self.inprocess = true;
            self.error = '';

            $http.post(fileManagerConfig.editUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('error_modifying'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.rename = function(item) {
            var path = this.getFilePath(item);
            var self = this;
            var deferred = $q.defer();
            var data = {params: {
                mode: 'rename',
                path: path,
                newPath: item.tempModel.fullPath()
            }};
            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.renameUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('error_renaming'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.getUrl = function(item) {
            var path = this.getFilePath(item);
            var data = {
                mode: 'download',
                path: path
            };
            return path && [fileManagerConfig.downloadFileUrl, $.param(data)].join('?');
        };

        ApiHandler.prototype.download = function(item, forceNewWindow) {
            //TODO: add spinner to indicate file is downloading
            var self = this;
            var deferred = $q.defer();
            var url = self.getUrl(item);

            if (item.isFolder()) {
                return;
            }
            if (! fileManagerConfig.downloadFilesByAjax || forceNewWindow || !$window.saveAs) {
                !$window.saveAs && $window.console.error('Your browser dont support ajax download, downloading by default');
                return $window.open(url, '_blank', '');
            }
            
            self.inprocess = true;
            $http.get(url).success(function(data) {
                var bin = new $window.Blob([data]);
                deferred.resolve(data);
                $window.saveAs(bin, item.model.name);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('error_downloading'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.compress = function(files, path) {
            var self = this;
            var deferred = $q.defer();
            var data = {params: {
                mode: 'compress',
                items: self.getFileList(files),
                destination: path.join('/') || '/'
            }};

            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.compressUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('error_compressing'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.extract = function(item, path) {
            var self = this;
            var deferred = $q.defer();
            var data = {params: {
                mode: 'extract',
                path: this.getFilePath(item),
                destination: path.join('/') || '/'
            }};

            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.extractUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('error_extracting'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.changePermissions = function(files, permsOctal, permsCode, recursive) {
            var self = this;
            var deferred = $q.defer();
            var data = {params: {
                mode: 'changepermissions',
                items: self.getFileList(files),
                perms: permsOctal,
                permsCode: permsCode,
                recursive: !!recursive
            }};
            
            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.permissionsUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('error_changing_perms'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.createFolder = function(name, path) {
            var self = this;
            var deferred = $q.defer();
            var data = {params: {
                mode: 'addfolder',
                path: path.join('/') || '/',
                name: name
            }};

            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.createFolderUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('error_creating_folder'));
            })['finally'](function() {
                self.inprocess = false;
            });
        
            return deferred.promise;
        };

        return ApiHandler;

    }]);
})(angular, jQuery);