<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Otp;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class AuthController extends Controller
{
    // Register
    public function register(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|string|email|unique:users',
            'password' => 'required|string|min:8',
        ]);

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'User registered successfully',
            'token'   => $token,
            'user'    => $user,
        ], 201);
    }

    // Login
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password credentials',
            ], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'token'   => $token,
            'user'    => $user,
        ]);
    }

    // Forgot Password — Send OTP
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User with this email not found'], 44);
        }

        $otpCode = str_pad(random_int(0, 9999), 4, '0', STR_PAD_LEFT);

        Otp::updateOrCreate(
            ['email' => $request->email],
            [
                'otp_code'   => $otpCode,
                'expires_at' => Carbon::now()->addMinutes(10),
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Verification OTP sent to email',
            'otp'     => $otpCode, // Returned for dev testing
        ]);
    }

    // Verify OTP
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp'   => 'required|string',
        ]);

        $record = Otp::where('email', $request->email)
            ->where('otp_code', $request->otp)
            ->where('expires_at', '>', Carbon::now())
            ->first();

        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired OTP code'], 400);
        }

        return response()->json(['success' => true, 'message' => 'OTP verified successfully']);
    }

    // Reset Password
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email'       => 'required|email',
            'newPassword' => 'required|string|min:8',
        ]);

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found'], 404);
        }

        $user->password = Hash::make($request->newPassword);
        $user->save();

        Otp::where('email', $request->email)->delete();

        return response()->json(['success' => true, 'message' => 'Password reset successfully']);
    }
}
