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

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-73551813-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script');
  ga.type = 'text/javascript';
  ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(ga, s);
})();

var RequestType = {
  NAV: 'nav',
  TIMING: 'timing-report',
};

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === RequestType.TIMING) {
    var detail = request.detail;
    _gaq.push(['_trackTiming', detail.category, detail.name, detail.value]);
  } else if (request.type === RequestType.NAV) {
    _gaq.push(['_trackPageview', request.url]);
  }
});

function loadImage(path, width, height) {
  return new Promise(function(resolve) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var image = new Image();
    var imageData;
    image.onload = function() {
      ctx.drawImage(image, 0, 0, width, height);
      imageData = ctx.getImageData(0, 0, width, height);
      resolve(imageData);
    };
    image.src = chrome.runtime.getURL(path);
  });
}

chrome.runtime.onInstalled.addListener(function() {
  var loadImages = Promise.all([
    loadImage('icon_active_19.png', 19, 19),
    loadImage('icon_active_38.png', 38, 38),
  ]);

  loadImages.then(function(imageDataArray) {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
      chrome.declarativeContent.onPageChanged.addRules([
        {
          conditions: [
            new chrome.declarativeContent.PageStateMatcher({
              pageUrl: { hostSuffix: '-review.googlesource.com' },
            }),
            new chrome.declarativeContent.PageStateMatcher({
              pageUrl: { hostSuffix: '-review.git.corp.google.com' },
            }),
            new chrome.declarativeContent.PageStateMatcher({
              pageUrl: { hostSuffix: '-review.staging-git.corp.google.com' },
            }),
          ],
          // And shows the extension's page action.
          actions: [ new chrome.declarativeContent.ShowPageAction() ]
        },
        {
          conditions: [
            new chrome.declarativeContent.PageStateMatcher({
              css: ['gr-app'],
            })
          ],
          actions: [ new chrome.declarativeContent.SetIcon({
            imageData: {
              19: imageDataArray[0],
              38: imageDataArray[1],
            }
          })]
        }
      ]);
    });
  });
});

var WEB_REQUEST_FILTER_URLS = {
  urls: [
    '*://*.googlesource.com/*',
    "*://*.git.corp.google.com/*",
    "*://*.staging-git.corp.google.com/*",
  ]
};

// There is no option to update a tab URL while also bypassing the cache. Hack
// around this limitation by setting a tab ID to be reloaded in the tab update
// callback below.
var tabIDToReload = null;
chrome.webRequest.onCompleted.addListener(
  function(details) {
    if (details.type === 'main_frame' && tabIDToReload != null) {
      chrome.tabs.reload(tabIDToReload, {bypassCache: true});
      tabIDToReload = null;
    }
  },
  WEB_REQUEST_FILTER_URLS
);

var POLYGERRIT_PATH_PREFIXES = [
  '/c/',
  '/q/',
  '/dashboard/',
];

function getGWTRedirectURL(url) {
  var hash = url.hash.substring(1);
  var pathname = url.pathname;
  if (pathname.startsWith('/c/') && parseInt(hash, 10) > 0) {
    pathname += '@' + hash;
  }
  url.hash = '#' + pathname;
  url.pathname = '';
  return url.toString();
}

var useCanary;

chrome.storage.sync.get({
  canary: false,
}, function(items) {
  useCanary = items.canary;
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace !== 'sync') { return; }

  for (var key in changes) {
    if (key === 'canary') {
      useCanary = changes[key].newValue;
    }
  }
});

chrome.webRequest.onHeadersReceived.addListener(
  function(details) {
    if (details.type !== 'main_frame') { return {}; }

    var url = new URL(details.url);
    var polygerritPath = false;
    for (var i = 0; i < POLYGERRIT_PATH_PREFIXES.length; i++) {
      if (url.pathname.startsWith(POLYGERRIT_PATH_PREFIXES[i])) {
        polygerritPath = true;
        break;
      }
    }
    if (!polygerritPath) { return {}; }

    if (details.statusCode === 404) {
      return {redirectUrl: getGWTRedirectURL(url)};
    } if (useCanary &&
          url.hostname.endsWith('-review.googlesource.com') &&
          !url.hostname.startsWith('canary')) {
      url.hostname = 'canary-' + url.hostname;
      return {redirectUrl: url.toString()};
    }

    return {};
  },
  WEB_REQUEST_FILTER_URLS,
  ['blocking']
);

chrome.pageAction.onClicked.addListener(function(tab) {
  var cookieID = {
    name: 'GERRIT_UI',
    url: tab.url,
  };
  chrome.cookies.get(cookieID, function(cookie) {
    if (cookie) {
      _gaq.push(['_trackEvent', 'Page Action', 'Switch to Gerrit']);
      chrome.cookies.remove(cookieID, function() {
        // The GWT UI does not handle PolyGerrit URL redirection.
        chrome.tabs.update(tab.id, {
          url: getGWTRedirectURL(new URL(tab.url)),
        }, function(tab) {
          tabIDToReload = tab.id;
        });
      });
    } else {
      _gaq.push(['_trackEvent', 'Page Action', 'Switch to PolyGerrit']);
      chrome.cookies.set({
        url: tab.url,
        name: 'GERRIT_UI',
        value: 'polygerrit',
        httpOnly: true,
        path: '/',
        secure: true,
      }, function() {
        // PolyGerrit handles Gerrit URL -> PolyGerrit URL redirection.
        chrome.tabs.reload(tab.id, {bypassCache: true});
      });
    }
  });
});
