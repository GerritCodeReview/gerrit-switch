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
        }
      ]);
    });
  });

  // There is no option to update a tab URL while also bypassing the cache. Hack
  // around this limitation by setting a tab ID to be reloaded the the tab
  // update callback below.
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
      if (cookie) {
        chrome.cookies.remove(cookieID, function() {
          // The GWT UI does not handle PolyGerrit URL redirection.
          chrome.tabs.update(tab.id, {
            url: tab.url.replace('googlesource.com/', 'googlesource.com/#/')
          }, function(tab) {
            tabIDToReload = tab.id;
          });
        });
      } else {
        chrome.cookies.set({
          url: tab.url,
          name: 'GERRIT_UI',
          value: 'polygerrit',
          httpOnly: true ,
          path: '/',
          secure: true,
        }, function() {
          // PolyGerrit handles Gerrit URL -> PolyGerrit URL redirection.
          chrome.tabs.reload(tab.id, {bypassCache: true});
        });
      }
    });
  });
});
