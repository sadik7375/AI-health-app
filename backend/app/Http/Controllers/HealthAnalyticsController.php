<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Medicine;
use App\Models\LabReport;

class HealthAnalyticsController extends Controller
{
    public function getAnalytics(Request $request)
    {
        $userId = $request->user()->id;

        // 1. Calculate Medicine Adherence Rate
        $totalMeds = Medicine::where('user_id', $userId)
            ->where(function ($q) {
                $q->whereNull('prescription_id')->orWhere('is_reminder', true);
            })->count();
            
        $takenMeds = Medicine::where('user_id', $userId)
            ->where(function ($q) {
                $q->whereNull('prescription_id')->orWhere('is_reminder', true);
            })->where('taken', true)->count();
            
        $adherence = $totalMeds > 0 ? round(($takenMeds / $totalMeds) * 100) : 100;

        // 2. Health Score Calculation
        $healthScore = min(100, max(50, 70 + ($adherence * 0.3)));

        // 3. Danger Zone Alerts (High/Low flagged reports)
        $dangerReports = LabReport::where('user_id', $userId)
            ->whereIn('status', ['High', 'Low'])
            ->get();

        // 4. Missed Medicines
        $missedMedicines = Medicine::where('user_id', $userId)
            ->where(function ($q) {
                $q->whereNull('prescription_id')->orWhere('is_reminder', true);
            })
            ->where('taken', false)
            ->get();

        return response()->json([
            'success'        => true,
            'health_score'   => $healthScore,
            'adherence_rate' => $adherence . '%',
            'danger_alerts'  => $dangerReports,
            'missed_doses'   => $missedMedicines,
        ]);
    }
}
