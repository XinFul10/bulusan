<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Document;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::query()->firstOrCreate(
            ['username' => 'admin@bulusan.gov.ph'],
            [
                'full_name' => 'System Administrator',
                'email' => 'admin@bulusan.gov.ph',
                'password' => Hash::make('bulusanadmin1234!'),
                'role' => 'admin',
                'status' => 'active',
            ]
        );

        User::query()->firstOrCreate(
            ['username' => 'staff1'],
            [
                'full_name' => 'Juan Dela Cruz',
                'email' => 'staff1@bulusan.gov.ph',
                'password' => Hash::make('staff'),
                'role' => 'staff',
                'status' => 'active',
            ]
        );

        $officeAccounts = [
            [
                'username' => 'department_head',
                'full_name' => 'Department Head Officer',
                'email' => 'department_head@bulusan.gov.ph',
                'department' => 'Department Head',
                'password' => 'departmenthead1234!',
            ],
            [
                'username' => 'budget_office',
                'full_name' => 'Budget Office Officer',
                'email' => 'budget_office@bulusan.gov.ph',
                'department' => 'Budget Office',
                'password' => 'budgetoffice1234!',
            ],
            [
                'username' => 'finance_office',
                'full_name' => 'Finance Office Officer',
                'email' => 'finance_office@bulusan.gov.ph',
                'department' => 'Finance Office',
                'password' => 'financeoffice1234!',
            ],
            [
                'username' => 'mayors_office',
                'full_name' => 'Mayor\'s Office Officer',
                'email' => 'mayors_office@bulusan.gov.ph',
                'department' => "Mayor's Office",
                'password' => 'mayorsoffice1234!',
            ],
        ];

        foreach ($officeAccounts as $account) {
            User::query()->firstOrCreate(
                ['username' => $account['username']],
                [
                    'full_name' => $account['full_name'],
                    'email' => $account['email'],
                    'password' => Hash::make($account['password']),
                    'role' => 'staff',
                    'status' => 'active',
                    'department' => $account['department'],
                ]
            );
        }

        $categories = [
            ['name' => 'Capacity Development', 'allocation' => 400000],
            ['name' => 'TM & Promotions', 'allocation' => 500000],
            ['name' => 'Socio-Cultural & Eco', 'allocation' => 3000000],
            ['name' => 'Product & Market Dev', 'allocation' => 1500000],
        ];

        foreach ($categories as $cat) {
            Category::query()->firstOrCreate(['name' => $cat['name']], $cat);
        }

        if (Transaction::query()->count() === 0) {
            $capDev = Category::query()->where('name', 'Capacity Development')->firstOrFail();
            $socio = Category::query()->where('name', 'Socio-Cultural & Eco')->firstOrFail();
            $promo = Category::query()->where('name', 'TM & Promotions')->firstOrFail();

            Transaction::query()->create([
                'transaction_date' => '2026-01-15',
                'description' => 'Training Workshop - Digital Marketing',
                'category_id' => $capDev->id,
                'a_b_test' => 'T1',
                'allocated_amount' => 50000,
                'obligated_amount' => 25000,
                'created_by' => $admin->id,
            ]);

            Transaction::query()->create([
                'transaction_date' => '2026-01-20',
                'description' => 'Eco-Tourism Site Development',
                'category_id' => $socio->id,
                'a_b_test' => 'T2',
                'allocated_amount' => 200000,
                'obligated_amount' => 150000,
                'created_by' => $admin->id,
            ]);

            Transaction::query()->create([
                'transaction_date' => '2026-02-01',
                'description' => 'Promotional Materials Printing',
                'category_id' => $promo->id,
                'a_b_test' => null,
                'allocated_amount' => 30000,
                'obligated_amount' => 30000,
                'created_by' => $admin->id,
            ]);
        }

        if (Document::query()->count() === 0) {
            Document::query()->create([
                'uploader_name' => 'Maria Santos',
                'description' => 'Signed budget endorsement letter (Q1)',
                'destination' => 'Office of the Mayor',
                'manually_delivered' => false,
                'created_by' => $admin->id,
            ]);

            Document::query()->create([
                'uploader_name' => 'Juan Dela Cruz',
                'description' => 'HR clearance & appointment papers',
                'destination' => 'HR',
                'manually_delivered' => true,
                'created_by' => $admin->id,
            ]);
        }
    }
}
