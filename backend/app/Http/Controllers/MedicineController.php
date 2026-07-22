<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Medicine;

class MedicineController extends Controller
{
    public function index(Request $request)
    {
        $medicines = Medicine::where('user_id', $request->user()->id)
            ->where(function ($q) {
                $q->whereNull('prescription_id')->orWhere('is_reminder', true);
            })
            ->orderBy('created_at', 'desc')
            ->get();

        $today = now()->format('Y-m-d');
        foreach ($medicines as $medicine) {
            if ($medicine->taken && $medicine->updated_at && $medicine->updated_at->format('Y-m-d') !== $today) {
                $medicine->taken = false;
                $medicine->save();
            }
        }

        return response()->json([
            'success'   => true,
            'medicines' => $medicines,
        ]);
    }

    public function toggleTaken(Request $request, $id)
    {
        $medicine = Medicine::where('user_id', $request->user()->id)->findOrFail($id);
        $medicine->taken = !$medicine->taken;
        $medicine->save();

        return response()->json([
            'success'  => true,
            'medicine' => $medicine,
        ]);
    }

    public function storeManual(Request $request)
    {
        $request->validate([
            'name'   => 'required|string',
            'dosage' => 'required|string',
            'time'   => 'required|string',
        ]);

        $medicine = new Medicine([
            'user_id'     => $request->user()->id,
            'name'        => $request->name,
            'dosage'      => $request->dosage,
            'time'        => $request->time,
            'doctor_name' => $request->doctor_name ?? 'Manual Entry',
            'taken'       => false,
        ]);

        if ($request->filled('date')) {
            try {
                $medicine->created_at = \Carbon\Carbon::parse($request->date);
            } catch (\Exception $e) {
                // Ignore invalid date format
            }
        }
        $medicine->save();

        return response()->json([
            'success'  => true,
            'medicine' => $medicine,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'name'   => 'required|string',
            'dosage' => 'required|string',
            'time'   => 'required|string',
        ]);

        $medicine = Medicine::where('user_id', $request->user()->id)->findOrFail($id);
        $medicine->name = $request->name;
        $medicine->dosage = $request->dosage;
        $medicine->time = $request->time;

        if ($request->filled('date')) {
            try {
                $medicine->created_at = \Carbon\Carbon::parse($request->date);
            } catch (\Exception $e) {
                // Ignore parse errors
            }
        }
        $medicine->save();

        return response()->json([
            'success'  => true,
            'medicine' => $medicine,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $medicine = Medicine::where('user_id', $request->user()->id)->findOrFail($id);
        $medicine->delete();

        return response()->json([
            'success' => true,
        ]);
    }

    public function updateSlotTimes(Request $request)
    {
        $request->validate([
            'morning'   => 'required|string',
            'afternoon' => 'required|string',
            'night'     => 'required|string',
        ]);

        $userId = $request->user()->id;

        Medicine::where('user_id', $userId)
            ->where('is_reminder', true)
            ->where('raw_notes', 'Morning')
            ->update(['time' => $request->morning]);

        Medicine::where('user_id', $userId)
            ->where('is_reminder', true)
            ->where('raw_notes', 'Afternoon')
            ->update(['time' => $request->afternoon]);

        Medicine::where('user_id', $userId)
            ->where('is_reminder', true)
            ->where('raw_notes', 'Night')
            ->update(['time' => $request->night]);

        return response()->json([
            'success' => true,
            'message' => 'Slot times updated successfully',
        ]);
    }
}
