// Copyright (C) 2016 The Android Open Source Project
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
(function() {
  var appEl = document.querySelector('gr-app');
  var isPolyGerrit = !!appEl;

  if (isPolyGerrit) {
    var page;
    var pendingEvents = [];
    var reportToBackground = function(e) {
      e.detail.host = location.host;
      chrome.runtime.sendMessage({type: e.type, detail: e.detail});
    };
    var reportNav = function(e) {
      page = e.detail.value;
      reportToBackground(e);
      if (pendingEvents.length) {
        pendingEvents.forEach(reportToBackground);
        pendingEvents = [];
      }
    };
    var reportTiming = function(e) {
      if (page) {
        reportToBackground(e);
      } else {
        pendingEvents.push(
            {type: e.type, detail: Object.assign({}, e.detail)});
      }
    };
    document.addEventListener('timing-report', reportTiming);
    document.addEventListener('nav-report', reportNav);
  } else {
    chrome.runtime.sendMessage({
      type: 'nav-report',
      detail: {
        value: '/#/', // Report GWT UI as dashboards landing url.
        host: location.host,
      },
    });
  }

})();
