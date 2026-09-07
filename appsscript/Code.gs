// Дошка задач — бекенд на Google Apps Script + Google Таблиці
// Деплой: Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone

const PIN = '2026';

function db_() {
  const p = PropertiesService.getScriptProperties();
  let id = p.getProperty('SS_ID'), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('Дошка задач — дані');
    p.setProperty('SS_ID', ss.getId());
    const t = ss.getSheets()[0]; t.setName('Tasks');
    t.appendRow(['id','block','title','description','assignee','status','createdAt','completedAt']);
    ss.insertSheet('Notes').appendRow(['id','taskId','author','text','createdAt']);
  }
  return ss;
}

function nextId_(key) {
  const p = PropertiesService.getScriptProperties();
  const n = Number(p.getProperty(key) || '0') + 1;
  p.setProperty(key, String(n));
  return n;
}

function rows_(sh) { const v = sh.getDataRange().getValues(); v.shift(); return v; }
function iso_(v) { if (!v) return null; if (v instanceof Date) return v.toISOString(); return String(v); }
function task_(r) { return { id: Number(r[0]), block: String(r[1]), title: String(r[2]), description: String(r[3] || ''), assignee: String(r[4]), status: String(r[5]), createdAt: iso_(r[6]), completedAt: iso_(r[7]) }; }
function note_(r) { return { id: Number(r[0]), taskId: Number(r[1]), author: String(r[2]), text: String(r[3]), createdAt: iso_(r[4]) }; }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet() { return out_({ ok: true, service: 'taskboard' }); }

function doPost(e) {
  let b = {};
  try { b = JSON.parse(e.postData.contents); } catch (err) { return out_({ error: 'bad request' }); }
  if (String(b.pin) !== PIN) return out_({ error: 'Невірний PIN' });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = db_(), T = ss.getSheetByName('Tasks'), N = ss.getSheetByName('Notes');
    switch (b.action) {
      case 'auth':
        return out_({ data: { ok: true } });
      case 'listTasks':
        return out_({ data: rows_(T).map(task_) });
      case 'createTask': {
        const id = nextId_('TASK_ID');
        T.appendRow([id, b.block, b.title, b.description || '', b.assignee, 'active', new Date().toISOString(), '']);
        return out_({ data: { id } });
      }
      case 'updateTask': {
        const v = T.getDataRange().getValues();
        for (let i = 1; i < v.length; i++) {
          if (Number(v[i][0]) === Number(b.id)) {
            if (b.title !== undefined) T.getRange(i + 1, 3).setValue(b.title);
            if (b.description !== undefined) T.getRange(i + 1, 4).setValue(b.description);
            if (b.assignee !== undefined) T.getRange(i + 1, 5).setValue(b.assignee);
            if (b.status !== undefined && String(v[i][5]) !== b.status) {
              T.getRange(i + 1, 6).setValue(b.status);
              T.getRange(i + 1, 8).setValue(b.status === 'done' ? new Date().toISOString() : '');
            }
            return out_({ data: { ok: true } });
          }
        }
        return out_({ error: 'not found' });
      }
      case 'deleteTask': {
        const v = T.getDataRange().getValues();
        for (let i = v.length - 1; i >= 1; i--) { if (Number(v[i][0]) === Number(b.id)) T.deleteRow(i + 1); }
        const nv = N.getDataRange().getValues();
        for (let i = nv.length - 1; i >= 1; i--) { if (Number(nv[i][1]) === Number(b.id)) N.deleteRow(i + 1); }
        return out_({ data: { ok: true } });
      }
      case 'listNotes':
        return out_({ data: rows_(N).map(note_).filter(function (n) { return n.taskId === Number(b.taskId); }) });
      case 'createNote': {
        const id = nextId_('NOTE_ID');
        N.appendRow([id, b.taskId, b.author, b.text, new Date().toISOString()]);
        return out_({ data: { id } });
      }
      default:
        return out_({ error: 'unknown action' });
    }
  } finally {
    lock.releaseLock();
  }
}
