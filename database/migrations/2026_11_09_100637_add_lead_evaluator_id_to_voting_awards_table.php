<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('voting_awards', function (Blueprint $table) {
            $table->integer('lead_evaluator_id')->nullable()->after('status');
            $table->foreign('lead_evaluator_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('voting_awards', function (Blueprint $table) {
            $table->dropForeign(['lead_evaluator_id']);
            $table->dropColumn('lead_evaluator_id');
        });
    }
};
