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

chrome.runtime.onInstalled.addListener(function() {
  var loadImages = new Promise(function(resolve) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var inactiveImage = new Image();
    var inactiveImageData;
    var activeImage = new Image();
    var activeImageData;
    activeImage.onload = function() {
      ctx.drawImage(activeImage, 0, 0, 38, 38);
      var activeImageData = ctx.getImageData(0, 0, 38, 38);

      inactiveImage.onload = function() {
        ctx.drawImage(inactiveImage, 0, 0, 38, 38);
        inactiveImageData = ctx.getImageData(0, 0, 38, 38);
        resolve({active: activeImageData, inactive: inactiveImageData});
      }
      inactiveImage.src = chrome.runtime.getURL('icon.png');
    }
    activeImage.src = chrome.runtime.getURL('icon_active.png');
  });

  loadImages.then(function(imageData) {
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
          actions: [ new chrome.declarativeContent.SetIcon({imageData: {38: imageData.active}}) ]
        }
      ]);
    });
  });

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
          chrome.tabs.reload(tab.id, {bypassCache: true});
        });
      }
    });
  });
});
