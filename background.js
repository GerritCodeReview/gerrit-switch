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
    loadImage('icon_canary_19.png', 19, 19),
    loadImage('icon_canary_38.png', 38, 38),
  ]);

  loadImages.then(function(imageDataArray) {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
      chrome.declarativeContent.onPageChanged.addRules([
        {
          conditions: [
            new chrome.declarativeContent.PageStateMatcher({
              pageUrl: { hostSuffix: '-review.googlesource.com' },
            })
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
        },
        {
          conditions: [
            new chrome.declarativeContent.PageStateMatcher({
              pageUrl: {
                hostPrefix: 'canary-',
                hostSuffix: '-review.googlesource.com'
              },
              css: ['gr-app']
            })
          ],
          actions: [ new chrome.declarativeContent.SetIcon({
            imageData: {
              19: imageDataArray[2],
              38: imageDataArray[3],
            }
          })]
        }
      ]);
    });
  });

  // There is no option to update a tab URL while also bypassing the cache. Hack
  // around this limitation by setting a tab ID to be reloaded in the tab update
  // callback below.
  var tabIDToReload = null;
  chrome.webRequest.onCompleted.addListener(
    function(details) {
      if (details.type == 'main_frame' && tabIDToReload != null) {
        chrome.tabs.reload(tabIDToReload, {bypassCache: true});
        tabIDToReload = null;
      }
    },
    {urls: ['*://*.googlesource.com/*']});

  chrome.pageAction.onClicked.addListener(function(tab) {
    var cookieID = {
      name: 'GERRIT_UI',
      url: tab.url,
    };
    chrome.cookies.get(cookieID, function(cookie) {
      var isPolyGerrit = !!cookie;
      var isCanary = tab.url.indexOf('//canary-') != -1;

      var wantPolyGerrit = isPolyGerrit;
      var wantCanary = isCanary;
      if (!isPolyGerrit) {
        wantPolyGerrit = true;
      } else if (!isCanary) {
        wantCanary = true;
      } else {
        wantPolyGerrit = false;
        wantCanary = false;
      }

      var newURL = tab.url;
      if (!isCanary && wantCanary) {
        newURL = newURL.replace('//', '//canary-');
      } else if (isCanary && !wantCanary) {
        newURL = newURL.replace('//canary-', '//');
      }

      // PolyGerrit handles Gerrit URL -> PolyGerrit URL redirection, but the
      // GWT UI doesn't handle PolyGerrit URL redirection when going the other
      // way.
      if (isPolyGerrit && !wantPolyGerrit) {
        newURL = newURL.replace('googlesource.com/', 'googlesource.com/#/');
      }

      var switchURL = tab.url != newURL;
      cookieID.url = newURL;

      if (wantPolyGerrit) {
        chrome.cookies.set({
          url: cookieID.url,
          name: cookieID.name,
          value: 'polygerrit',
          httpOnly: true ,
          path: '/',
          secure: true,
        }, function() {
          if (!switchURL) {
            chrome.tabs.reload(tab.id, {bypassCache: true});
          } else {
            chrome.tabs.update(tab.id, { url: newURL }, function (tab) {
              tabIDToReload = tab.id;
            });
          }
        });
      } else {
        chrome.cookies.remove(cookieID, function() {
          if (!switchURL) {
            chrome.tabs.reload(tab.id, {bypassCache: true});
          } else {
            chrome.tabs.update(tab.id, { url: newURL }, function (tab) {
              tabIDToReload = tab.id;
            });
          }
        });
      }
    });
  });
});
