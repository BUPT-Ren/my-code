# include<iostream>
# include<vector>
using namespace std;
//问题描述：给你一个数组num和一个值val，
//你需要原地移除所有等于val的数并返回这个数组
//的长度，要在原地处理 元素的顺序可以改变

// 相向双指针：left 从头找 val，right 从尾兜底
// 遇到 val 就用尾部元素覆盖，
//val 的个数越少赋值越少
//就是先去移动左指针，如果遇到要删的值
//用右指针覆盖
int removeElement(vector<int>& nums, int val) {
    int left = 0, right = nums.size() - 1;
    while (left <= right) {
        if (nums[left] == val) {
            nums[left] = nums[right]; // 用尾部元素覆盖
            right--;
        } else {
            left++;
        }
    }
    return left; // left 处即为新长度
}

int main() {
    vector<int> nums = { 3, 2, 2, 3, 4, 3 };
    int val = 3;

    int len = removeElement(nums, val);

    cout << "新长度: " << len << endl;
    cout << "前 " << len << " 个元素: ";
    for (int i = 0; i < len; i++) {
        cout << nums[i] << " ";
    }
    cout << endl;

    return 0;
}

