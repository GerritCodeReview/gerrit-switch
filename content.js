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
  // TODO(andybons): Integrate with the Gerrit JS API. Since this is loaded
  // before the Gerrit object is in scope, this type of integration may require
  // an event to be fired to indicate that the Gerrit object is available.
  var appEl = document.querySelector('gr-app');
  var isPolyGerrit = !!appEl;
  if (isPolyGerrit) {
    // TODO(andybons): Integrate with the Gerrit JS API. PageJS isn't in scope
    // and is a pain to latch on to for navigation events.
  } else {
    // Initial load doesn't call popstate in GWT.
    chrome.runtime.sendMessage({
      type: 'nav',
      url: window.location.href,
    });
    window.addEventListener('popstate', function() {
      chrome.runtime.sendMessage({
        type: 'nav',
        url: window.location.href,
      });
    });
  }
})();
