function saveOptions() {
  var canary = document.querySelector('.likeCheckbox').checked;
  chrome.storage.sync.set({
    canary: canary,
  }, function() {
    var status = document.querySelector('.statusMessage');
    status.textContent = 'All set. Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 1500);
  });
}

function restoreOptions() {
  chrome.storage.sync.get({
    canary: false,
  }, function(items) {
    document.querySelector('.likeCheckbox').checked = items.canary;
  });
}
document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('.saveButton').addEventListener('click', saveOptions);
