/** Renders the Monitor panel body (memory access table). */
export function renderMonitorPanel(): string {
  return `
  <div id="monitor-empty" class="empty">No memory accesses this session</div>
  <table id="monitor-table" style="display:none;width:100%;border-collapse:collapse;font-size:11px;margin-top:8px">
    <thead>
      <tr style="opacity:0.6;text-align:left">
        <th style="padding:4px 2px">File</th>
        <th style="padding:4px 2px">Tier</th>
        <th style="padding:4px 2px;text-align:right">Used</th>
        <th style="padding:4px 2px;text-align:right">Saved</th>
      </tr>
    </thead>
    <tbody id="monitor-rows"></tbody>
    <tfoot>
      <tr style="font-weight:600;border-top:1px solid var(--vscode-panel-border)">
        <td style="padding:4px 2px" colspan="2">Total</td>
        <td id="monitor-total-used" style="padding:4px 2px;text-align:right">0 tk</td>
        <td id="monitor-total-saved" style="padding:4px 2px;text-align:right;color:var(--vscode-charts-green)">0 tk</td>
      </tr>
    </tfoot>
  </table>
  <button class="move-btn" style="margin-top:10px;width:100%" onclick="clearSession()">⊘ Clear Session</button>`;
}
