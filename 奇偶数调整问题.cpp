# include<iostream>
# include<cstdlib>
# include<ctime>
# include<cstring>
using namespace std;

//问题描述
/*
 整形数组，把偶数调整到数组的左边，把奇数调整到数组的右边
*/

// 双指针：把偶数调整到左边，奇数调整到右边（原地，O(n)，相对顺序不保证）
void adjustEvenOdd(int arr[], int len) {
	int left = 0, right = len - 1;
	while (left < right) {
		// left 向右移动，直到遇到奇数（需要被移到右边）
		while (left < right && arr[left] % 2 == 0) ++left;
		// right 向左移动，直到遇到偶数（需要被移到左边）
		while (left < right && arr[right] % 2 != 0) --right;
		// 交换这一对错位的数
		if (left < right) {
			int tmp = arr[left];
			arr[left] = arr[right];
			arr[right] = tmp;
			++left;
			--right;
		}
	}
}

// 写法一：指针 + 长度（经典写法）
//将数组作为参数传入函数，会退化成指针，
//函数不知道数组的长度
void printArr(int arr[], int len) {
	for (int i = 0; i < len; ++i) {
		cout << arr[i] << " ";
	}
	cout << endl;
}

// 写法二：数组引用 + 范围 for
//数组引用  用模板 这样可以接收不同长度的数组
//不同作用域中的实参或者形参可以重名
template<size_t N>
void printArr(int (&arr)[N]) {
    //范围for循环
	for (int i : arr) {
		cout << i << " ";
	}
	cout << endl;
}

int main() {
	int arr[] = { 1, 2, 3, 4, 5, 6, 7, 8 };
	int len = sizeof(arr) / sizeof(arr[0]);

	cout << "调整前: ";
	printArr(arr);

	adjustEvenOdd(arr, len);

	cout << "调整后: ";
	printArr(arr);

	return 0;
}
