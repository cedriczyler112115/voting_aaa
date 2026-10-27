<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (! Schema::hasColumn('users', 'voting_role')) {
                    $table->string('voting_role', 20)->default('voter')->index();
                }
                if (! Schema::hasColumn('users', 'is_status')) {
                    $table->smallInteger('is_status')->default(1)->nullable();
                }
            });

            // Automatically grant admin voting_role to existing Super Admins (user_level_id = 1) or admin emails
            if (Schema::hasColumn('users', 'user_level_id')) {
                DB::table('users')
                    ->where('user_level_id', 1)
                    ->orWhere('email', 'like', '%admin%')
                    ->update(['voting_role' => 'admin']);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'voting_role')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('voting_role');
            });
        }
    }
};
