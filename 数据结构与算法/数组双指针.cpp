# include<iostream>
# include<cstdlib>
# include<ctime>
# include<cstring>
using namespace std;
//数组中的双指针问题
//逆序字符串 任意类型的字符串均可
void Reverse(char arr[],int size){
    char *p = arr;
    char *q = arr+size-1;
    //设置一个终止条件
    while(p < q){
        char ch = *p;
        *p = *q;
        *q = ch;
        p++;
        q--;
    }
  
}
int main(){
    char arr[] = "Hello World";
    Reverse(arr,strlen(arr));
    cout<<arr<<endl;
}