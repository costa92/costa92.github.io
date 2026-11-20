(function () {
  'use strict';

  function init() {
    var article = document.getElementById('articleContent');
    if (!article) return;

    Array.prototype.forEach.call(article.querySelectorAll('table'), function (table) {
      if (table.classList.contains('responsive-table-cards')) return;

      // Only regular tables can be read as independent cards. Keep merged or
      // multi-level tables intact so column relationships remain understandable.
      var head = table.tHead;
      if (!head || head.rows.length !== 1 || table.tFoot) return;
      var headers = Array.prototype.slice.call(head.rows[0].cells);
      var rows = Array.prototype.reduce.call(table.tBodies, function (all, body) {
        return all.concat(Array.prototype.slice.call(body.rows));
      }, []);
      if (!headers.length || !rows.length || headers.some(function (cell) {
        return cell.tagName !== 'TH' || cell.colSpan !== 1 || cell.rowSpan !== 1;
      }) || rows.some(function (row) {
        return row.cells.length !== headers.length || Array.prototype.some.call(row.cells, function (cell) {
          return cell.tagName !== 'TD' || cell.colSpan !== 1 || cell.rowSpan !== 1;
        });
      })) return;

      table.classList.add('responsive-table-cards');
      rows.forEach(function (row) {
        Array.prototype.forEach.call(row.cells, function (cell, index) {
          var label = document.createElement('span');
          label.className = 'responsive-table-label';
          label.textContent = headers[index].textContent.trim() || '第 ' + (index + 1) + ' 列';
          label.setAttribute('aria-hidden', 'true');

          var value = document.createElement('div');
          value.className = 'responsive-table-value';
          while (cell.firstChild) value.appendChild(cell.firstChild);
          cell.appendChild(label);
          cell.appendChild(value);
        });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
