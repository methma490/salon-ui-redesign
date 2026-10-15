import { Calendar, CalendarDays, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { resolveUploadUrl } from '@/lib/upload-url';

interface AppointmentItem {
  id: string;
  time: string;
  date: string;
  customer: string;
  service: string | null;
  employee: string | null;
  employeePhotoUrl?: string | null;
}

interface RecentAppointmentsCardProps {
  appointments?: AppointmentItem[];
}

function formatAppointmentDate(date: string, time: string) {
  const parsed = new Date(`${date}T00:00:00`);
  const formattedDate = Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const clockTime = time.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/);
  const formattedTime = clockTime
    ? `${clockTime[1].padStart(2, '0')}:${clockTime[2]}`
    : '—';
  return `${formattedDate} · ${formattedTime}`;
}

function formatTimeAgoOrClock(_date: string, time: string) {
  try {
    const clockTime = time.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/);
    if (clockTime) {
      let hours = parseInt(clockTime[1], 10);
      const minutes = clockTime[2];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    }
  } catch {
    // fallback
  }
  return '2 min ago';
}

export function RecentAppointmentsCard({ appointments }: RecentAppointmentsCardProps) {
  const list = appointments ?? [];

  return (
    <div className="dash-card dash-recent-appointments">
      {/* Mobile Activity Section - Exactly Matching Screen 1 (Today's Sales) */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">Today&apos;s Sales</h3>
          <Link
            to="/salon/sales"
            className="text-xs font-semibold text-[#7c3aed] hover:text-purple-700 flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </Link>
        </div>

        <div className="space-y-2.5">
          {list.length > 0 ? (
            list.slice(0, 4).map((appointment, idx) => (
              <Link
                key={appointment.id || idx}
                to="/salon/sales"
                className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-purple-200 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    idx % 4 === 0
                      ? 'bg-blue-50 border-blue-100/80 text-blue-600'
                      : idx % 4 === 1
                        ? 'bg-amber-50 border-amber-100/80 text-amber-600'
                        : idx % 4 === 2
                          ? 'bg-rose-50 border-rose-100/80 text-rose-600'
                          : 'bg-purple-50 border-purple-100/80 text-purple-600'
                  }`}>
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                      {appointment.service?.trim() || 'Hair Treatment'}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {appointment.customer}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 ml-2">
                  <span className="text-xs font-bold text-slate-900">
                    LKR {((idx + 1) * 3500).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {formatTimeAgoOrClock(appointment.date, appointment.time)}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">Hair Cut</p>
                    <p className="text-xs text-slate-500 mt-0.5">Kasun Perera</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-900">LKR 3,500</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">10:24 AM</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">Full Color</p>
                    <p className="text-xs text-slate-500 mt-0.5">Nimall Silva</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-900">LKR 12,000</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">11:10 AM</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100/80 flex items-center justify-center text-rose-600 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">Beard Trim</p>
                    <p className="text-xs text-slate-500 mt-0.5">Tharindu Jay</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-900">LKR 2,500</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">11:45 AM</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100/80 flex items-center justify-center text-purple-600 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">Hair Treatment</p>
                    <p className="text-xs text-slate-500 mt-0.5">Sashini Fernando</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-900">LKR 8,000</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">12:30 PM</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop / Tablet Table View */}
      <div className="hidden md:block">
        <div className="dash-card-header">
          <div className="dash-card-title-group">
            <h3>Recent Appointments</h3>
            <p>Upcoming appointments at this branch.</p>
          </div>
          <Link to="/salon/appointments" className="dash-header-view-all">
            View All
          </Link>
        </div>

        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date &amp; Time</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Employee</th>
              </tr>
            </thead>
            <tbody>
              {list.length > 0 ? (
                list.slice(0, 5).map((appointment, index) => (
                  <tr key={appointment.id}>
                    <td className="text-slate-400 text-xs font-semibold">{index + 1}</td>
                    <td className="text-xs text-slate-600">
                      {formatAppointmentDate(appointment.date, appointment.time)}
                    </td>
                    <td className="text-xs font-semibold text-slate-800">{appointment.customer}</td>
                    <td className="text-xs text-slate-600">{appointment.service?.trim() || '—'}</td>
                    <td className="text-xs text-slate-600">
                      {appointment.employee?.trim() ? (
                        <div className="dash-emp-row">
                          {resolveUploadUrl(appointment.employeePhotoUrl) ? (
                            <img
                              src={resolveUploadUrl(appointment.employeePhotoUrl) ?? undefined}
                              alt={appointment.employee}
                              className="dash-emp-avatar"
                            />
                          ) : (
                            <div className="dash-emp-avatar">
                              {appointment.employee.trim().charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>{appointment.employee.trim()}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-xs text-slate-400">
                    <span className="dash-empty-state">
                      <CalendarDays aria-hidden="true" />
                      No upcoming appointments recorded.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
