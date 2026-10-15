import { CalendarDays } from 'lucide-react';
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

export function RecentAppointmentsCard({ appointments }: RecentAppointmentsCardProps) {
  const list = appointments ?? [];

  return (
    <div className="dash-card dash-recent-appointments">
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
  );
}
