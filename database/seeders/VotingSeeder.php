<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\VotingAward;
use App\Models\VotingEvent;
use App\Models\VotingNominee;
use App\Models\VotingUserEligibility;
use Illuminate\Database\Seeder;

class VotingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $admin = User::where('voting_role', 'admin')->first()
            ?? User::first();

        // 1. Create or retrieve the Annual Recognition Awards 2026 event
        $event = VotingEvent::firstOrCreate(
            ['slug' => 'annual-recognition-awards-2026'],
            [
                'title' => 'Annual Recognition Awards 2026',
                'description' => 'Celebrating excellence, outstanding teamwork, and impactful contributions across the organization.',
                'status' => 'published',
                'starts_at' => now()->subDays(1),
                'ends_at' => now()->addDays(14),
                'results_visibility' => 'after_closing',
                'allow_vote_changes' => true,
                'created_by' => $admin?->id,
            ]
        );

        // 2. Awards definition
        $awardsData = [
            [
                'name' => 'Best Employee of the Year',
                'description' => 'Recognizing exceptional individual commitment, exemplary work ethics, and leadership.',
                'display_order' => 1,
                'nominees' => [
                    [
                        'name' => 'Eleanor Vance',
                        'department' => 'Operations & Strategy',
                        'description' => 'Led cross-departmental efficiency initiatives resulting in a 35% productivity increase.',
                        'display_order' => 1,
                    ],
                    [
                        'name' => 'Marcus Chen',
                        'department' => 'Technology & Engineering',
                        'description' => 'Architected scalable core systems with 99.99% uptime and zero security breaches.',
                        'display_order' => 2,
                    ],
                    [
                        'name' => 'Sophia Rodriguez',
                        'department' => 'Client Success',
                        'description' => 'Maintained 98% client satisfaction rate and pioneered new onboarding workflows.',
                        'display_order' => 3,
                    ],
                    [
                        'name' => 'Lucas Wright',
                        'department' => 'Finance & Risk',
                        'description' => 'Spearheaded risk mitigation protocols across institutional capital portfolios.',
                        'display_order' => 4,
                    ],
                    [
                        'name' => 'Hannah Abbott',
                        'department' => 'Talent Acquisition',
                        'description' => 'Revolutionized recruitment pipelines reducing requisition-to-hire turnaround by 40%.',
                        'display_order' => 5,
                    ],
                ],
            ],
            [
                'name' => 'Most Outstanding Team',
                'description' => 'Honoring collaborative excellence and outstanding synergy in meeting mission-critical goals.',
                'display_order' => 2,
                'nominees' => [
                    [
                        'name' => 'Cloud Infrastructure & DevOps Team',
                        'department' => 'IT Infrastructure',
                        'description' => 'Successfully orchestrated zero-downtime infrastructure migration across regional nodes.',
                        'display_order' => 1,
                    ],
                    [
                        'name' => 'Product Experience & Design Guild',
                        'department' => 'User Experience',
                        'description' => 'Redesigned core internal dashboards, boosting staff engagement and reducing task times.',
                        'display_order' => 2,
                    ],
                    [
                        'name' => 'Special Projects Task Force',
                        'department' => 'Executive Office',
                        'description' => 'Delivered the annual institutional compliance audit with exemplary commendations.',
                        'display_order' => 3,
                    ],
                ],
            ],
            [
                'name' => "People's Choice Award",
                'description' => 'Voted by peers for camaraderie, positivity, and uplifting workplace culture.',
                'display_order' => 3,
                'nominees' => [
                    [
                        'name' => 'Amara Okafor',
                        'department' => 'Human Resources & People Ops',
                        'description' => 'Always ready to support staff development and workplace wellness programs.',
                        'display_order' => 1,
                    ],
                    [
                        'name' => 'David Kim',
                        'department' => 'Finance & Accounting',
                        'description' => 'Renowned for patience, thorough financial clarity, and collaborative spirit.',
                        'display_order' => 2,
                    ],
                    [
                        'name' => 'Zara Morales',
                        'department' => 'Communications & Media',
                        'description' => 'Brings unmatched energy and creativity to institutional branding and internal events.',
                        'display_order' => 3,
                    ],
                ],
            ],
            [
                'name' => 'Most Innovative Employee',
                'description' => 'Celebrating inventive problem-solving, novel automated workflows, and forward thinking.',
                'display_order' => 4,
                'nominees' => [
                    [
                        'name' => 'Liam Bennett',
                        'department' => 'Data Analytics',
                        'description' => 'Developed automated verification pipelines saving hundreds of manual staff hours.',
                        'display_order' => 1,
                    ],
                    [
                        'name' => 'Chloe Dubois',
                        'department' => 'Digital Solutions',
                        'description' => 'Integrated intelligent queue-dispatch algorithms for field offices.',
                        'display_order' => 2,
                    ],
                ],
            ],
        ];

        foreach ($awardsData as $awardItem) {
            $nominees = $awardItem['nominees'];
            unset($awardItem['nominees']);

            $award = VotingAward::firstOrCreate(
                [
                    'voting_event_id' => $event->id,
                    'name' => $awardItem['name'],
                ],
                array_merge($awardItem, [
                    'status' => 'active',
                    'results_visibility' => 'inherit',
                ])
            );

            foreach ($nominees as $nomineeData) {
                VotingNominee::firstOrCreate(
                    [
                        'voting_award_id' => $award->id,
                        'name' => $nomineeData['name'],
                    ],
                    array_merge($nomineeData, [
                        'status' => 'active',
                    ])
                );
            }
        }

        // 3. Populate allowed voters list for this event
        $users = User::all();
        foreach ($users as $user) {
            VotingUserEligibility::firstOrCreate(
                [
                    'voting_event_id' => $event->id,
                    'user_id' => $user->id,
                ],
                [
                    'is_eligible' => true,
                    'reason' => 'Official employee voter list',
                ]
            );
        }
    }
}
